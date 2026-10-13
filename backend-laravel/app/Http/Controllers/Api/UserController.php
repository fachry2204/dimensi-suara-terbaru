<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    private const FIELDS = ['id', 'username', 'email', 'role', 'status', 'type', 'account_type', 'full_name', 'company_name', 'phone', 'created_at'];

    public function index(Request $request): JsonResponse
    {
        if (!$this->isStaff($request)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }
        $search = trim((string) $request->query('q', ''));
        $users = DB::table('users')->select(self::FIELDS)
            ->when($request->query('role') === 'User', fn ($query) => $query->where('role', 'User'))
            ->when($request->query('role') === 'Admin', fn ($query) => $query->whereIn('role', ['Admin', 'Operator']))
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search) {
                $query->where('full_name', 'like', '%'.$search.'%')
                    ->orWhere('company_name', 'like', '%'.$search.'%')
                    ->orWhere('username', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%');
            }))
            ->orderByDesc('id')->paginate(25);

        return response()->json($users);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        if (!$this->isStaff($request) && (int) $request->attributes->get('cms_user')->id !== $id) {
            return response()->json(['error' => 'Forbidden'], 403);
        }
        $fields = array_merge(self::FIELDS, ['nik', 'address', 'country', 'province', 'city', 'district', 'subdistrict', 'postal_code', 'pic_name', 'pic_position', 'pic_phone', 'bank_name', 'bank_account_number', 'bank_account_name', 'aggregator_percentage', 'publishing_percentage', 'rejection_reason', 'block_reason', 'contract_status']);
        $user = DB::table('users')->select($fields)->where('id', $id)->first();
        if (!$user) return response()->json(['error' => 'Not found'], 404);
        $documents = [];
        foreach (['ktp_doc_path', 'npwp_doc_path', 'signature_doc_path', 'nib_doc_path', 'kemenkumham_doc_path', 'contract_doc_path'] as $field) {
            $documents[$field] = DB::table('users')->where('id', $id)->whereNotNull($field)->where($field, '<>', '')->exists();
        }
        return response()->json(['user' => $user, 'documents' => $documents]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (strtolower((string) $request->attributes->get('cms_user')->role) !== 'admin') {
            return response()->json(['error' => 'Hanya admin yang dapat mengubah status pengguna'], 403);
        }
        $user = DB::table('users')->where('id', $id)->first(['id', 'role']);
        if (!$user) return response()->json(['error' => 'Pengguna tidak ditemukan'], 404);
        if (strtolower((string) $user->role) !== 'user') {
            return response()->json(['error' => 'Akun admin/operator dikelola melalui menu Admin'], 422);
        }
        $data = $request->validate([
            'status' => ['required', Rule::in(['Pending', 'Review', 'Approved', 'Rejected', 'Active', 'Inactive', 'Blocked'])],
            'rejectionReason' => ['nullable', 'string', 'max:2000'], 'blockReason' => ['nullable', 'string', 'max:2000'],
            'aggregatorPercentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'publishingPercentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);
        if ($data['status'] === 'Rejected' && trim((string) ($data['rejectionReason'] ?? '')) === '') {
            return response()->json(['error' => 'Alasan penolakan wajib diisi'], 422);
        }
        if ($data['status'] === 'Blocked' && trim((string) ($data['blockReason'] ?? '')) === '') {
            return response()->json(['error' => 'Alasan pemblokiran wajib diisi'], 422);
        }
        DB::table('users')->where('id', $id)->update([
            'status' => $data['status'],
            'rejection_reason' => $data['status'] === 'Rejected' ? trim((string) $data['rejectionReason']) : null,
            'rejected_date' => $data['status'] === 'Rejected' ? now() : null,
            'block_reason' => $data['status'] === 'Blocked' ? trim((string) $data['blockReason']) : null,
            'blocked_at' => $data['status'] === 'Blocked' ? now() : null,
            'aggregator_percentage' => $data['aggregatorPercentage'] ?? 0,
            'publishing_percentage' => $data['publishingPercentage'] ?? 0,
            'joined_date' => in_array($data['status'], ['Approved', 'Active'], true) ? now() : null,
        ]);
        return response()->json(['success' => true, 'id' => $id, 'status' => $data['status']]);
    }

    public function createStaff(Request $request): JsonResponse
    {
        if (strtolower((string) $request->attributes->get('cms_user')->role) !== 'admin') {
            return response()->json(['error' => 'Hanya admin yang dapat membuat akun staf'], 403);
        }
        $data = $request->validate([
            'role' => ['required', Rule::in(['Admin', 'Operator'])],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'max:128'],
        ]);
        $email = Str::lower(trim($data['email']));
        if (DB::table('users')->whereRaw('LOWER(username) = ?', [$email])->exists()) {
            return response()->json(['error' => 'Email sudah digunakan'], 422);
        }
        $id = DB::table('users')->insertGetId([
            'username' => $email, 'email' => $email, 'password_hash' => Hash::make($data['password']),
            'role' => $data['role'], 'status' => 'Active', 'type' => 'Personal', 'account_type' => 'PERSONAL',
            'full_name' => trim($data['name']), 'created_at' => now(), 'registered_at' => now(),
        ]);
        return response()->json(['success' => true, 'id' => $id, 'role' => $data['role']], 201);
    }

    public function resetStaffPassword(Request $request, int $id): JsonResponse
    {
        if (strtolower((string) $request->attributes->get('cms_user')->role) !== 'admin') {
            return response()->json(['error' => 'Hanya admin yang dapat mereset password staf'], 403);
        }
        $staff = DB::table('users')->where('id', $id)->whereIn('role', ['Admin', 'Operator'])->first(['id']);
        if (!$staff) return response()->json(['error' => 'Akun admin/operator tidak ditemukan'], 404);
        $data = $request->validate(['password' => ['required', 'string', 'min:8', 'max:128', 'confirmed']]);
        DB::table('users')->where('id', $id)->update(['password_hash' => Hash::make($data['password'])]);
        return response()->json(['success' => true]);
    }

    private function isStaff(Request $request): bool
    {
        return in_array(strtolower((string) $request->attributes->get('cms_user')->role), ['admin', 'operator'], true);
    }
}
