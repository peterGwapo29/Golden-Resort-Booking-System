<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\ChangeStaffPasswordRequest;
use App\Http\Requests\Staff\UpdateStaffProfileRequest;
use App\Services\SecurityAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class StaffProfileController extends Controller
{
    /**
     * Display the authenticated staff member's profile.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_active' => (bool) $user->is_active,
                'phone' => $user->phone,
                'department' => $user->department,
                'notes' => $user->notes,
                'last_login_at' => $user->last_login_at?->toISOString(),
                'created_at' => $user->created_at?->toISOString(),
                'permissions' => $user->getAllPermissions(),
            ],
        ]);
    }

    /**
     * Update permitted profile fields for the authenticated staff member.
     */
    public function update(UpdateStaffProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->only(['name', 'phone']);
        $user->update($data);

        SecurityAuditLogger::log('staff.profile.updated', 'Staff profile updated', [
            'user_id' => $user->id,
            'updated_fields' => array_keys($data),
        ]);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_active' => (bool) $user->is_active,
                'phone' => $user->phone,
                'department' => $user->department,
                'notes' => $user->notes,
                'last_login_at' => $user->last_login_at?->toISOString(),
                'permissions' => $user->getAllPermissions(),
            ],
        ]);
    }

    /**
     * Securely update the authenticated staff member's password.
     */
    public function changePassword(ChangeStaffPasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check($request->input('current_password'), $user->password)) {
            SecurityAuditLogger::log('staff.password.change_failed', 'Incorrect current password provided for password change', [
                'user_id' => $user->id,
            ]);

            throw ValidationException::withMessages([
                'current_password' => ['The current password provided is incorrect.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($request->input('password')),
        ]);

        // Revoke all other active personal access tokens for this user, keeping the current session
        $currentTokenId = $user->currentAccessToken()?->id;
        if ($currentTokenId) {
            $user->tokens()->where('id', '!=', $currentTokenId)->delete();
        }

        SecurityAuditLogger::log('staff.password.changed', 'Staff password changed successfully', [
            'user_id' => $user->id,
        ]);

        return response()->json([
            'message' => 'Password changed successfully. Other active sessions have been signed out.',
        ]);
    }
}
