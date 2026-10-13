<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function csrf(Request $request): JsonResponse
    {
        return response()->json(['token' => $request->session()->token()]);
    }

    public function session(Request $request): JsonResponse
    {
        $id = $request->session()->get('cms_user_id');
        if (!is_numeric($id)) {
            return response()->json(['user' => null]);
        }
        $user = DB::table('users')->where('id', (int) $id)->first();
        if (!$user) {
            $request->session()->forget('cms_user_id');
            return response()->json(['user' => null]);
        }
        $role = strtolower((string) $user->role);
        $status = strtolower((string) $user->status);
        if (!in_array($role, ['admin', 'operator'], true) && !in_array($status, ['approved', 'active'], true)) {
            return response()->json(['user' => null]);
        }
        return response()->json(['user' => $this->publicUser($user)]);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $identifier = Str::lower(trim($data['email']));
        $user = DB::table('users')
            ->whereRaw('LOWER(email) = ?', [$identifier])
            ->orWhereRaw('LOWER(username) = ?', [$identifier])
            ->first();

        if (!$user || !Hash::check($data['password'], (string) ($user->password_hash ?? ''))) {
            return response()->json(['error' => 'Email atau password salah'], 401);
        }

        $role = strtolower((string) $user->role);
        $status = strtolower((string) $user->status);
        if (!in_array($role, ['admin', 'operator'], true) && !in_array($status, ['approved', 'active'], true)) {
            return response()->json(['error' => 'Akun belum disetujui atau sedang dinonaktifkan'], 403);
        }

        $request->session()->regenerate();
        $request->session()->put('cms_user_id', (int) $user->id);

        return response()->json(['success' => true, 'user' => $this->publicUser($user)]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'user' => $this->publicUser($request->attributes->get('cms_user'))]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['success' => true]);
    }

    public function checkDuplicate(Request $request): JsonResponse
    {
        $duplicate = $this->duplicates(
            Str::lower(trim((string) $request->input('email', ''))),
            trim((string) $request->input('phone', '')),
            trim((string) $request->input('companyName', $request->input('company_name', ''))),
        );

        return response()->json(['success' => true, 'duplicate' => $duplicate]);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:128'],
            'accountType' => ['required', Rule::in(['PERSONAL', 'COMPANY'])],
            'fullName' => ['required', 'string', 'max:255'],
            'companyName' => ['required_if:accountType,COMPANY', 'nullable', 'string', 'max:255'],
            'nik' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string'],
            'country' => ['required', 'string', 'max:100'],
            'province' => ['required_if:country,Indonesia', 'nullable', 'string', 'max:100'],
            'city' => ['required_if:country,Indonesia', 'nullable', 'string', 'max:100'],
            'district' => ['required_if:country,Indonesia', 'nullable', 'string', 'max:100'],
            'subdistrict' => ['required_if:country,Indonesia', 'nullable', 'string', 'max:100'],
            'postalCode' => ['required_if:country,Indonesia', 'nullable', 'regex:/^[0-9]{5,10}$/'],
            'phone' => ['nullable', 'string', 'max:20'],
            'picName' => ['nullable', 'string', 'max:255'],
            'picPosition' => ['nullable', 'string', 'max:255'],
            'picPhone' => ['nullable', 'string', 'max:50'],
            'bankName' => ['nullable', 'string', 'max:100'],
            'bankAccountNumber' => ['nullable', 'string', 'max:50'],
            'bankAccountName' => ['nullable', 'string', 'max:100'],
            'ktpDocPath' => ['required', 'string', 'max:255'],
            'npwpDocPath' => ['required', 'string', 'max:255'],
            'signatureDocPath' => ['required', 'string', 'max:255'],
            'nibDocPath' => ['required_if:accountType,COMPANY', 'nullable', 'string', 'max:255'],
            'kemenkumhamDocPath' => ['required_if:accountType,COMPANY', 'nullable', 'string', 'max:255'],
        ]);

        $email = Str::lower(trim($data['email']));
        $duplicate = $this->duplicates($email, trim((string) ($data['phone'] ?? '')), trim((string) ($data['companyName'] ?? '')));
        if ($duplicate !== []) {
            return response()->json(['error' => 'Data pendaftaran sudah digunakan', 'duplicate' => $duplicate], 409);
        }

        foreach (['ktpDocPath', 'npwpDocPath', 'signatureDocPath'] as $field) {
            if (!$this->validRegistrationDocument($request, $data[$field])) {
                return response()->json(['error' => 'Dokumen pendaftaran tidak ditemukan: '.$field], 422);
            }
        }
        if ($data['accountType'] === 'COMPANY') {
            foreach (['nibDocPath', 'kemenkumhamDocPath'] as $field) {
                if (!$this->validRegistrationDocument($request, (string) ($data[$field] ?? ''))) {
                    return response()->json(['error' => 'Dokumen perusahaan tidak ditemukan: '.$field], 422);
                }
            }
        }

        $values = [
            'username' => $email,
            'email' => $email,
            'password_hash' => Hash::make($data['password']),
            'role' => 'User',
            'status' => 'Pending',
            'type' => $data['accountType'] === 'COMPANY' ? 'Perusahaan' : 'Personal',
            'account_type' => $data['accountType'],
            'company_name' => $data['accountType'] === 'COMPANY' ? ($data['companyName'] ?? null) : null,
            'full_name' => $data['fullName'],
            'nik' => $data['nik'] ?? null,
            'address' => $data['address'] ?? null,
            'country' => $data['country'] ?? null,
            'province' => $data['province'] ?? null,
            'city' => $data['city'] ?? null,
            'district' => $data['district'] ?? null,
            'subdistrict' => $data['subdistrict'] ?? null,
            'postal_code' => $data['postalCode'] ?? null,
            'phone' => $data['phone'] ?? null,
            'pic_name' => $data['picName'] ?? null,
            'pic_position' => $data['picPosition'] ?? null,
            'pic_phone' => $data['picPhone'] ?? null,
            'bank_name' => $data['bankName'] ?? null,
            'bank_account_number' => $data['bankAccountNumber'] ?? null,
            'bank_account_name' => $data['bankAccountName'] ?? null,
            'ktp_doc_path' => $data['ktpDocPath'],
            'npwp_doc_path' => $data['npwpDocPath'],
            'signature_doc_path' => $data['signatureDocPath'],
            'nib_doc_path' => $data['nibDocPath'] ?? null,
            'kemenkumham_doc_path' => $data['kemenkumhamDocPath'] ?? null,
            'created_at' => now(),
            'registered_at' => now(),
        ];

        $available = array_flip(Schema::getColumnListing('users'));
        $id = DB::table('users')->insertGetId(array_intersect_key($values, $available));
        $request->session()->forget('registration_uploads');

        return response()->json(['success' => true, 'userId' => $id, 'status' => 'Pending'], 201);
    }

    private function duplicates(string $email, string $phone, string $companyName): array
    {
        $duplicates = [];
        if ($email !== '' && DB::table('users')->whereRaw('LOWER(email) = ?', [$email])->orWhereRaw('LOWER(username) = ?', [$email])->exists()) {
            $duplicates[] = 'EMAIL';
        }
        if ($phone !== '' && DB::table('users')->where('phone', $phone)->exists()) {
            $duplicates[] = 'PHONE';
        }
        if ($companyName !== '' && DB::table('users')->whereRaw('LOWER(company_name) = ?', [Str::lower($companyName)])->exists()) {
            $duplicates[] = 'COMPANY';
        }
        return $duplicates;
    }

    private function validRegistrationDocument(Request $request, string $storedPath): bool
    {
        if (!preg_match('#^/uploads/profiles/[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp|pdf)$#i', $storedPath)) {
            return false;
        }
        return !empty($request->session()->get('registration_uploads', [])[$storedPath])
            && is_file(dirname(base_path()).'/uploads/profiles/'.basename($storedPath));
    }

    private function publicUser(object $user): array
    {
        return [
            'id' => (int) $user->id,
            'name' => $user->full_name ?: $user->username,
            'email' => $user->email,
            'role' => $user->role,
            'status' => $user->status,
        ];
    }
}
