<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DocumentController extends Controller
{
    private const FIELDS = ['ktp_doc_path', 'npwp_doc_path', 'signature_doc_path', 'nib_doc_path', 'kemenkumham_doc_path', 'contract_doc_path'];

    public function uploadRegistrationDocument(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['ktp', 'npwp', 'nib', 'kemenkumham', 'signature'])],
            'file' => ['required', 'file', 'max:10240', 'mimes:jpg,jpeg,png,webp,pdf'],
        ]);
        $file = $data['file'];
        if ($data['type'] === 'kemenkumham' && $file->getMimeType() !== 'application/pdf') {
            return response()->json(['error' => 'Dokumen Kemenkumham wajib PDF'], 422);
        }
        $name = $data['type'].'-'.Str::uuid().'.'.$file->extension();
        $directory = dirname(base_path()).'/uploads/profiles';
        if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
            return response()->json(['error' => 'Penyimpanan dokumen tidak tersedia'], 500);
        }
        $file->move($directory, $name);
        $path = '/uploads/profiles/'.$name;
        $uploaded = $request->session()->get('registration_uploads', []);
        $uploaded[$path] = true;
        $request->session()->put('registration_uploads', $uploaded);
        return response()->json(['success' => true, 'path' => $path]);
    }

    public function show(Request $request, int $id, string $field): BinaryFileResponse|JsonResponse
    {
        $role = strtolower((string) $request->attributes->get('cms_user')->role);
        if (!in_array($role, ['admin', 'operator'], true) && (int) $request->attributes->get('cms_user')->id !== $id) {
            return response()->json(['error' => 'Forbidden'], 403);
        }
        if (!in_array($field, self::FIELDS, true)) {
            return response()->json(['error' => 'Dokumen tidak valid'], 400);
        }
        $stored = DB::table('users')->where('id', $id)->value($field);
        if (!$stored) {
            return response()->json(['error' => 'Dokumen belum tersedia'], 404);
        }
        $file = $this->resolveFile((string) $stored);
        if (!$file) {
            return response()->json(['error' => 'File dokumen tidak ditemukan di server'], 404);
        }
        $response = $request->query('download') === '1'
            ? response()->download($file, basename($file))
            : response()->file($file);
        $response->headers->set('Cache-Control', 'private, no-store');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        return $response;
    }

    private function resolveFile(string $stored): ?string
    {
        $root = dirname(base_path());
        if (!preg_match('#^/uploads/([A-Za-z0-9/_-]+\.(?:jpg|jpeg|png|webp|pdf))$#i', $stored, $matches) || str_contains($stored, '..')) {
            return null;
        }
        foreach ([$root.'/uploads/'.$matches[1], $root.'/public/uploads/'.$matches[1], $root.'/httpdocs/uploads/'.$matches[1]] as $candidate) {
            if (is_file($candidate)) {
                return $candidate;
            }
        }
        return null;
    }
}
