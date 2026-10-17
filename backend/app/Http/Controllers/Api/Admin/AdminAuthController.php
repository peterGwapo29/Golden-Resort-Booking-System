<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminLoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AdminAuthController extends Controller
{
    /**
     * Authenticate an administrator and issue a Sanctum personal access token.
     */
    public function login(AdminLoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', $request->input('email'))->first();

        if (! $user || ! Hash::check($request->input('password'), $user->password)) {
            \App\Services\SecurityAuditLogger::log('auth.login.failed', 'Admin login failed', [
                'email' => $request->input('email'),
            ]);

            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        if (! $user->isAdmin()) {
            \App\Services\SecurityAuditLogger::log('auth.login.forbidden', 'Non-admin user attempted admin login', [
                'email' => $user->email,
                'role' => $user->role,
            ]);

            return response()->json([
                'message' => 'Access denied. You do not have administrator permissions.',
            ], 403);
        }

        $token = $user->createToken('admin-token', ['admin'])->plainTextToken;

        \App\Services\SecurityAuditLogger::log('auth.login.success', 'Admin login successful', [
            'email' => $user->email,
            'user_id' => $user->id,
        ]);

        return response()->json([
            'message' => 'Authentication successful.',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    /**
     * Terminate the authenticated admin session and revoke token.
     */
    public function logout(Request $request): JsonResponse
    {
        $userId = $request->user()?->id;
        $request->user()->currentAccessToken()?->delete();

        \App\Services\SecurityAuditLogger::log('auth.logout', 'Admin logged out', [
            'user_id' => $userId,
        ]);

        return response()->json([
            'message' => 'Successfully logged out.',
        ]);
    }

    /**
     * Return authenticated admin profile.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }
}
