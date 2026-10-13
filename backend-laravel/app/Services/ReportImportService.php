<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use RuntimeException;

class ReportImportService
{
    private const COLUMNS = ['reporting_month','sales_month','platform','country_region','label_name','artist_name','release_title','track_title','upc','isrc','streaming_subscription_type','release_type','sales_type','quantity','client_payment_currency','net_revenue'];

    public function import(UploadedFile $file, string $aggregator, string $period, int $actorId): int
    {
        $hash=hash_file('sha256',$file->getRealPath());
        if(DB::table('report_batches')->where('file_sha256',$hash)->exists()) throw new RuntimeException('File report yang sama sudah pernah diupload.');
        $sheet=IOFactory::load($file->getRealPath())->getActiveSheet(); $matrix=$sheet->toArray('',true,true,false);
        $headers=[]; foreach(($matrix[0]??[]) as $i=>$value){$key=$this->header($value);if($key&&!isset($headers[$key]))$headers[$key]=$i;}
        $missing=array_values(array_diff(self::COLUMNS,array_keys($headers))); if($missing)throw new RuntimeException('Kolom wajib belum tersedia: '.implode(', ',$missing));
        $dir=dirname(base_path()).'/storage/private/reports/'.substr($period,0,4).'/'.substr($period,5,2); if(!is_dir($dir))mkdir($dir,0750,true);
        $id=DB::table('report_batches')->insertGetId(['aggregator_name'=>$aggregator,'report_period'=>$period.'-01','original_file_name'=>$file->getClientOriginalName(),'stored_file_path'=>'','file_mime_type'=>$file->getMimeType(),'file_size'=>$file->getSize(),'file_sha256'=>$hash,'sheet_name'=>$sheet->getTitle(),'status'=>'PROCESSING','total_rows'=>0,'matched_rows'=>0,'no_account_rows'=>0,'conflict_rows'=>0,'invalid_rows'=>0,'gross_idr_total'=>0,'user_revenue_total'=>0,'aggregator_revenue_total'=>0,'uploaded_by'=>$actorId,'uploaded_at'=>now(),'created_at'=>now(),'updated_at'=>now()]);
        $name=$id.'_'.now()->format('YmdHis').'_'.preg_replace('/[^A-Za-z0-9._-]/','_',$file->getClientOriginalName()); $batchDir=$dir.'/'.$id; if(!is_dir($batchDir))mkdir($batchDir,0750,true); $file->move($batchDir,$name); $path=str_replace('\\','/',substr($batchDir.'/'.$name,strlen(dirname(base_path())))); DB::table('report_batches')->where('id',$id)->update(['stored_file_path'=>$path]);
        foreach(array_slice($matrix,1) as $index=>$raw){$data=[];foreach(self::COLUMNS as $column)$data[$column]=$raw[$headers[$column]]??null;if(!array_filter($data,fn($v)=>trim((string)$v)!==''))continue;$upc=$this->upc($data['upc']);$isrc=$this->isrc($data['isrc']);$quantity=$this->decimal($data['quantity']);$revenue=$this->decimal($data['net_revenue']);$status=(!$quantity&&$quantity!=='0')||(!$revenue&&$revenue!=='0')||(!$upc&&!$isrc)?'INVALID':'NO_ACCOUNT';$error=$status==='INVALID'?'Quantity/Net Revenue tidak valid atau UPC dan ISRC kosong.':null;
            $rowId=DB::table('report_rows')->insertGetId(['report_batch_id'=>$id,'row_number'=>$index+2,'reporting_month'=>$data['reporting_month']?:null,'sales_month'=>$data['sales_month']?:null,'platform'=>$data['platform']?:null,'country_region'=>$data['country_region']?:null,'label_name'=>$data['label_name']?:null,'artist_name'=>$data['artist_name']?:null,'release_title'=>$data['release_title']?:null,'track_title'=>$data['track_title']?:null,'upc_original'=>$data['upc']?:null,'upc_normalized'=>$upc?:null,'isrc_original'=>$data['isrc']?:null,'isrc_normalized'=>$isrc?:null,'streaming_subscription_type'=>$data['streaming_subscription_type']?:null,'release_type'=>$data['release_type']?:null,'sales_type'=>$data['sales_type']?:null,'quantity'=>$quantity,'client_payment_currency'=>strtoupper(trim((string)$data['client_payment_currency'])?:'IDR'),'net_revenue'=>$revenue,'status'=>$status,'error_message'=>$error,'created_at'=>now(),'updated_at'=>now()]);if($status!=='INVALID')$this->match($rowId,$upc,$isrc);
        }
        $this->summarize($id); DB::table('report_batches')->where('id',$id)->update(['status'=>'READY_FOR_REVIEW','updated_at'=>now()]); return $id;
    }

    public function rematchBatch(int $batchId): void { foreach(DB::table('report_rows')->where('report_batch_id',$batchId)->whereIn('status',['NO_ACCOUNT','CONFLICT'])->get() as $r)$this->match($r->id,$r->upc_normalized,$r->isrc_normalized);$this->summarize($batchId); }
    private function match(int $rowId,?string $upc,?string $isrc):void
    {
        $isrcMatches=$isrc?DB::table('tracks as t')->join('releases as r','r.id','=','t.release_id')->whereRaw("REPLACE(REPLACE(UPPER(t.isrc),'-',''),' ','') = ?",[$isrc])->select('r.user_id','r.id as release_id','t.id as track_id')->get():collect();
        $upcMatches=$upc?DB::table('releases as r')->whereRaw("REPLACE(REPLACE(REPLACE(r.upc,'-',''),' ',''),'.','') = ?",[$upc])->select('r.user_id','r.id as release_id')->get():collect();
        $iu=$isrcMatches->pluck('user_id')->unique()->values();$uu=$upcMatches->pluck('user_id')->unique()->values();$status='NO_ACCOUNT';$method=null;$selected=null;$error='Tidak ada akun yang memiliki UPC atau ISRC ini.';
        if($iu->count()>1||$uu->count()>1||($iu->count()===1&&$uu->count()===1&&(int)$iu[0]!== (int)$uu[0])){$status='CONFLICT';$error='UPC atau ISRC terdeteksi pada pemilik yang berbeda.';}elseif($iu->count()===1){$status='MATCHED';$method=$uu->count()===1?'ISRC_UPC':'ISRC';$selected=$isrcMatches->first();$error=null;}elseif($uu->count()===1){$status='MATCHED';$method='UPC';$selected=$upcMatches->first();$error=null;}
        DB::table('report_rows')->where('id',$rowId)->update(['status'=>$status,'match_method'=>$method,'matched_user_id'=>$selected->user_id??null,'matched_release_id'=>$selected->release_id??null,'matched_track_id'=>$selected->track_id??null,'match_details'=>json_encode(['isrc_users'=>$iu,'upc_users'=>$uu]),'error_message'=>$error,'updated_at'=>now()]);
    }
    private function summarize(int $id):void{$s=DB::table('report_rows')->where('report_batch_id',$id)->selectRaw("COUNT(*) total_rows, SUM(status='MATCHED') matched_rows, SUM(status='NO_ACCOUNT') no_account_rows, SUM(status='CONFLICT') conflict_rows, SUM(status='INVALID') invalid_rows")->first();$curr=DB::table('report_rows')->where('report_batch_id',$id)->selectRaw('client_payment_currency currency,SUM(net_revenue) total')->groupBy('client_payment_currency')->get();DB::table('report_batches')->where('id',$id)->update(['total_rows'=>$s->total_rows?:0,'matched_rows'=>$s->matched_rows?:0,'no_account_rows'=>$s->no_account_rows?:0,'conflict_rows'=>$s->conflict_rows?:0,'invalid_rows'=>$s->invalid_rows?:0,'gross_revenue_summary'=>json_encode($curr),'updated_at'=>now()]);}
    private function header($v):?string{$n=preg_replace('/[^a-z0-9]/','',strtolower(trim((string)$v)));foreach(self::COLUMNS as $c)if(str_replace('_','',$c)===$n)return $c;return null;}
    private function upc($v):string{return preg_replace('/\D/','',(string)$v);} private function isrc($v):string{return preg_replace('/[\s-]/','',strtoupper(trim((string)$v)));}
    private function decimal($v):?string{$v=trim((string)$v);if($v==='')return null;$v=str_replace(' ','',$v);if(str_contains($v,',')&&str_contains($v,'.'))$v=strrpos($v,',')>strrpos($v,'.')?str_replace(',','.',str_replace('.','',$v)):str_replace(',','',$v);elseif(str_contains($v,','))$v=str_replace(',','.',$v);return is_numeric($v)?$v:null;}
}
