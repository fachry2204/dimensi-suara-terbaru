<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class RequireCmsUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $userId = $request->session()->get('cms_user_id');
        if (!is_numeric($userId)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $user = DB::table('users')->where('id', (int) $userId)->first();
        if (!$user) {
            $request->session()->invalidate();
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $role = strtolower((string) ($user->role ?? ''));
        $status = strtolower((string) ($user->status ?? ''));
        if (!in_array($role, ['admin', 'operator'], true) && !in_array($status, ['approved', 'active'], true)) {
            return response()->json(['error' => 'Akun belum disetujui atau dinonaktifkan'], 403);
        }

        $request->attributes->set('cms_user', $user);
        return $next($request);
    }
}
