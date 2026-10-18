<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminLoginRequest;
use App\Models\User;
use App\Services\SecurityAuditLogger;
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
            SecurityAuditLogger::log('auth.login.failed', 'Admin login failed', [
                'email' => $request->input('email'),
            ]);

            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        if (! $user->isActive()) {
            SecurityAuditLogger::log('auth.login.deactivated', 'Deactivated account attempted login', [
                'email' => $user->email,
                'user_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'Your account has been deactivated. Please contact an administrator.',
            ], 403);
        }

        if (! $user->isStaff()) {
            SecurityAuditLogger::log('auth.login.forbidden', 'Unauthorized user attempted staff login', [
                'email' => $user->email,
                'role' => $user->role,
            ]);

            return response()->json([
                'message' => 'Access denied. You do not have staff or administrator permissions.',
            ], 403);
        }

        $user->update(['last_login_at' => now()]);

        $abilities = $user->isAdmin() ? ['*'] : $user->getAllPermissions();
        $token = $user->createToken('staff-token', $abilities)->plainTextToken;

        SecurityAuditLogger::log('auth.login.success', 'Staff authentication successful', [
            'email' => $user->email,
            'user_id' => $user->id,
            'role' => $user->role,
        ]);

        return response()->json([
            'message' => 'Authentication successful.',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_active' => $user->is_active,
                'phone' => $user->phone,
                'department' => $user->department,
                'permissions' => $user->getAllPermissions(),
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

        SecurityAuditLogger::log('auth.logout', 'Staff logged out', [
            'user_id' => $userId,
        ]);

        return response()->json([
            'message' => 'Successfully logged out.',
        ]);
    }

    /**
     * Return authenticated staff profile.
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
                'is_active' => $user->is_active,
                'phone' => $user->phone,
                'department' => $user->department,
                'permissions' => $user->getAllPermissions(),
            ],
        ]);
    }
}
