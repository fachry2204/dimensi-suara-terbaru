<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ContractGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ContractController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->attributes->get('cms_user'); $staff = $this->staff($actor);
        $query = DB::table('user_contracts as c')->join('users as u', 'u.id', '=', 'c.user_id')
            ->leftJoin('contract_signing_requests as s', function ($join) { $join->on('s.contract_id', '=', 'c.id')->whereNotIn('s.status', ['SUPERSEDED']); })
            ->select('c.id','c.user_id','c.version','c.status','c.file_name','c.generated_at','c.is_current','u.full_name','u.company_name','u.email','s.status as signing_status','s.sent_at','s.expires_at','s.signed_at')
            ->when(!$staff, fn ($q) => $q->where('c.user_id', $actor->id))->orderByDesc('c.id');
        return response()->json(['contracts' => $query->get()]);
    }

    public function generate(Request $request, int $userId, ContractGenerator $generator): JsonResponse
    {
        if (!$this->admin($request->attributes->get('cms_user'))) return response()->json(['error' => 'Hanya admin yang dapat membuat kontrak'], 403);
        $user = DB::table('users')->where('id', $userId)->where('role', 'User')->first();
        if (!$user) return response()->json(['error' => 'User tidak ditemukan'], 404);
        $missing = $this->missing($user); if ($missing) return response()->json(['error' => 'Data user belum lengkap: '.implode(', ', $missing)], 422);
        $template = DB::table('contract_templates')->where('is_active', 1)->where(function ($q) use ($user) {
            $q->whereNull('account_type')->orWhere('account_type', strtoupper((string) ($user->account_type ?: $user->type)));
        })->orderByDesc('version')->first();
        if (!$template) return response()->json(['error' => 'Template kontrak aktif belum tersedia'], 422);
        try { $file = $generator->generate($user, $template); }
        catch (\Throwable $e) { return response()->json(['error' => $e->getMessage()], 422); }
        $version = ((int) DB::table('user_contracts')->where('user_id', $userId)->max('version')) + 1;
        DB::transaction(function () use ($userId, $template, $file, $version, $request): void {
            DB::table('user_contracts')->where('user_id', $userId)->update(['is_current' => 0]);
            DB::table('user_contracts')->insert([
                'user_id'=>$userId,'contract_template_id'=>$template->id,'version'=>$version,'status'=>'GENERATED','file_name'=>$file['file_name'],
                'file_path'=>$file['file_path'],'mime_type'=>$file['mime_type'],'file_size'=>$file['file_size'],'checksum_sha256'=>$file['checksum_sha256'],
                'generated_data_snapshot'=>json_encode($file['snapshot']),'generated_by'=>$request->attributes->get('cms_user')->id,'generated_at'=>$file['generated_at'],
                'is_current'=>1,'created_at'=>now(),'updated_at'=>now(),
            ]);
            DB::table('users')->where('id', $userId)->update(['contract_status'=>'GENERATED']);
        });
        return response()->json(['success'=>true,'message'=>'Kontrak berhasil dibuat dari template asli.','version'=>$version], 201);
    }

    public function send(Request $request, int $id): JsonResponse
    {
        if (!$this->admin($request->attributes->get('cms_user'))) return response()->json(['error' => 'Hanya admin yang dapat mengirim kontrak'], 403);
        $contract = DB::table('user_contracts as c')->join('users as u','u.id','=','c.user_id')->where('c.id',$id)
            ->select('c.*','u.email','u.phone','u.full_name')->first();
        if (!$contract) return response()->json(['error'=>'Kontrak tidak ditemukan'],404);
        $token = Str::random(64); $expires = now()->addDays(7);
        DB::table('contract_signing_requests')->where('contract_id',$id)->where('status','PENDING')->update(['status'=>'SUPERSEDED','updated_at'=>now()]);
        $signingId = DB::table('contract_signing_requests')->insertGetId([
            'contract_id'=>$id,'user_id'=>$contract->user_id,'token_hash'=>hash('sha256',$token),'status'=>'PENDING','sent_by'=>$request->attributes->get('cms_user')->id,
            'sent_at'=>now(),'expires_at'=>$expires,'email_status'=>'PENDING','whatsapp_status'=>'PENDING','created_at'=>now(),'updated_at'=>now(),
        ]);
        $url = rtrim((string) config('app.frontend_url', env('FRONTEND_URL','http://127.0.0.1:5175')),'/').'/contract/sign/'.$token;
        [$emailStatus,$emailError] = $this->email($contract,$url);
        [$waStatus,$waError] = $this->whatsapp($contract,$url);
        DB::table('contract_signing_requests')->where('id',$signingId)->update(['email_status'=>$emailStatus,'email_error'=>$emailError,'whatsapp_status'=>$waStatus,'whatsapp_error'=>$waError,'updated_at'=>now()]);
        DB::table('user_contracts')->where('id',$id)->update(['status'=>'SENT','updated_at'=>now()]);
        DB::table('users')->where('id',$contract->user_id)->update(['contract_status'=>'SENT']);
        return response()->json(['success'=>true,'message'=>'Kontrak siap ditandatangani.','signing_url'=>$url,'expires_at'=>$expires,'delivery'=>['email'=>$emailStatus,'whatsapp'=>$waStatus]]);
    }

    public function document(Request $request, int $id): BinaryFileResponse|JsonResponse
    {
        $actor=$request->attributes->get('cms_user'); $contract=DB::table('user_contracts')->where('id',$id)->first();
        if(!$contract) return response()->json(['error'=>'Kontrak tidak ditemukan'],404);
        if(!$this->staff($actor)&&(int)$contract->user_id!==(int)$actor->id) return response()->json(['error'=>'Forbidden'],403);
        return $this->fileResponse($contract->file_path,$contract->file_name,$request->query('download')==='1');
    }

    public function signing(string $token): JsonResponse
    {
        $row=$this->signingRow($token); if($row instanceof JsonResponse) return $row;
        return response()->json(['contract'=>['id'=>$row->contract_id,'file_name'=>$row->file_name,'user_name'=>$row->full_name,'email'=>$row->email,'expires_at'=>$row->expires_at,'status'=>$row->status]]);
    }

    public function signingDocument(string $token): BinaryFileResponse|JsonResponse
    {
        $row=$this->signingRow($token); if($row instanceof JsonResponse) return $row;
        return $this->fileResponse($row->file_path,$row->file_name,false);
    }

    public function sign(Request $request, string $token): JsonResponse
    {
        $row=$this->signingRow($token); if($row instanceof JsonResponse) return $row;
        $data=$request->validate(['signer_name'=>['required','string','max:255'],'signer_email'=>['required','email','max:255'],'signature'=>['required','string'],'consent'=>['accepted']]);
        if(strtolower(trim($data['signer_email']))!==strtolower((string)$row->email)) return response()->json(['error'=>'Email penanda tangan tidak sesuai dengan pemilik kontrak'],422);
        if(!preg_match('#^data:image/png;base64,([A-Za-z0-9+/=]+)$#',$data['signature'],$m)) return response()->json(['error'=>'Format tanda tangan tidak valid'],422);
        $binary=base64_decode($m[1],true); if($binary===false||strlen($binary)<100||strlen($binary)>2_000_000) return response()->json(['error'=>'Data tanda tangan tidak valid'],422);
        $dir=dirname(base_path()).'/storage/private/contract-signatures/'.$row->user_id; if(!is_dir($dir)) mkdir($dir,0750,true);
        $path=$dir.'/signature-'.$row->id.'-'.now()->format('YmdHis').'.png'; file_put_contents($path,$binary);
        DB::transaction(function()use($row,$data,$request,$path):void{
            DB::table('contract_signing_requests')->where('id',$row->id)->update(['status'=>'SIGNED','signed_at'=>now(),'signer_name'=>trim($data['signer_name']),'signer_email'=>strtolower(trim($data['signer_email'])),'signer_ip'=>$request->ip(),'signer_user_agent'=>substr((string)$request->userAgent(),0,1000),'signature_file_path'=>str_replace('\\','/',substr($path,strlen(dirname(base_path())))),'signed_file_path'=>$row->file_path,'signed_file_name'=>$row->file_name,'signed_file_size'=>filesize($this->absolute($row->file_path)),'signed_checksum_sha256'=>hash_file('sha256',$this->absolute($row->file_path)),'updated_at'=>now()]);
            DB::table('user_contracts')->where('id',$row->contract_id)->update(['status'=>'SIGNED','updated_at'=>now()]); DB::table('users')->where('id',$row->user_id)->update(['contract_status'=>'SIGNED']);
        });
        return response()->json(['success'=>true,'message'=>'Kontrak berhasil ditandatangani secara digital.']);
    }

    private function signingRow(string $token): mixed
    {
        $row=DB::table('contract_signing_requests as s')->join('user_contracts as c','c.id','=','s.contract_id')->join('users as u','u.id','=','s.user_id')->where('s.token_hash',hash('sha256',$token))->select('s.*','c.file_path','c.file_name','u.full_name','u.email')->first();
        if(!$row) return response()->json(['error'=>'Tautan kontrak tidak valid'],404); if($row->status==='SIGNED') return response()->json(['error'=>'Kontrak sudah ditandatangani'],409); if($row->status!=='PENDING'||now()->greaterThan($row->expires_at)) return response()->json(['error'=>'Tautan kontrak sudah tidak berlaku'],410); return $row;
    }
    private function fileResponse(string $path,string $name,bool $download): BinaryFileResponse|JsonResponse { $file=$this->absolute($path); if(!is_file($file))return response()->json(['error'=>'File kontrak tidak ditemukan'],404); return $download?response()->download($file,$name):response()->file($file,['Content-Disposition'=>'inline; filename="'.$name.'"']); }
    private function absolute(string $path):string{return preg_match('#^[A-Za-z]:[\\/]#',$path)?$path:dirname(base_path()).'/'.ltrim(str_replace('\\','/',$path),'/');}
    private function staff(object $u):bool{return in_array(strtolower((string)$u->role),['admin','operator'],true);} private function admin(object $u):bool{return strtolower((string)$u->role)==='admin';}
    private function missing(object $u):array{$required=['full_name'=>'Nama','nik'=>'NIK','address'=>'Alamat','subdistrict'=>'Kelurahan','district'=>'Kecamatan','city'=>'Kota','province'=>'Provinsi','postal_code'=>'Kode pos','phone'=>'No. HP','bank_name'=>'Bank','bank_account_number'=>'No. rekening','bank_account_name'=>'Nama rekening','aggregator_percentage'=>'Persentase aggregator'];$m=[];foreach($required as $f=>$l)if($u->$f===null||trim((string)$u->$f)==='')$m[]=$l;return $m;}
    private function email(object $c,string $url):array { if(config('mail.default')==='log') { \Log::info('Contract signing link',['to'=>$c->email,'url'=>$url]); return ['LOGGED',null]; } try { Mail::raw("Halo {$c->full_name},\n\nSilakan tandatangani kontrak digital Anda: {$url}\nTautan berlaku 7 hari.",fn($m)=>$m->to($c->email)->subject('Tanda Tangan Kontrak Dimensi Suara')); return ['SENT',null]; } catch(\Throwable $e){return ['FAILED',$e->getMessage()];} }
    private function whatsapp(object $c,string $url):array { $endpoint=config('services.whatsapp.url'); if(!$endpoint)return ['NOT_CONFIGURED',null]; try{$r=Http::withToken((string)config('services.whatsapp.token'))->post($endpoint,['phone'=>$c->phone,'message'=>'Silakan tandatangani kontrak Dimensi Suara: '.$url]);return $r->successful()?['SENT',null]:['FAILED','HTTP '.$r->status()];}catch(\Throwable $e){return ['FAILED',$e->getMessage()];} }
}
