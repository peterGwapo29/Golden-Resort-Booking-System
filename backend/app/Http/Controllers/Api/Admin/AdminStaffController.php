<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateStaffRequest;
use App\Http\Requests\Admin\ResetStaffPasswordRequest;
use App\Http\Requests\Admin\UpdateStaffRequest;
use App\Models\User;
use App\Services\SecurityAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminStaffController extends Controller
{
    /**
     * Display a paginated listing of resort staff accounts.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        // Search filter (name, email, phone, department)
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('department', 'like', "%{$search}%");
            });
        }

        // Role filter
        if ($role = $request->input('role')) {
            if ($role !== 'all' && in_array($role, User::ROLES, true)) {
                $query->where('role', $role);
            }
        }

        // Status filter (active, deactivated)
        if ($status = $request->input('status')) {
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'deactivated') {
                $query->where('is_active', false);
            }
        }

        // Department filter
        if ($department = $request->input('department')) {
            if ($department !== 'all') {
                $query->where('department', $department);
            }
        }

        $perPage = min(max((int) $request->input('per_page', 15), 5), 100);
        $paginated = $query->orderBy('name')->paginate($perPage);

        // Calculate summary metrics across the staff directory
        $allStaff = User::query();
        $total = $allStaff->count();
        $activeCount = User::where('is_active', true)->count();
        $deactivatedCount = User::where('is_active', false)->count();

        $roleCounts = [];
        foreach (User::ROLES as $r) {
            $roleCounts[$r] = User::where('role', $r)->count();
        }

        return response()->json([
            'data' => $paginated->items(),
            'metrics' => [
                'total' => $total,
                'active' => $activeCount,
                'deactivated' => $deactivatedCount,
                'roles' => $roleCounts,
            ],
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Store a newly created staff account.
     */
    public function store(CreateStaffRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['password'] = Hash::make($data['password']);
        $data['is_active'] = true;

        $staff = User::create($data);

        SecurityAuditLogger::log('staff.created', "Admin created staff account #{$staff->id} ({$staff->email})", [
            'staff_id' => $staff->id,
            'role' => $staff->role,
            'email' => $staff->email,
        ]);

        return response()->json([
            'message' => 'Staff account created successfully.',
            'staff' => $staff,
        ], 201);
    }

    /**
     * Display the specified staff account details.
     */
    public function show(int $id): JsonResponse
    {
        $staff = User::findOrFail($id);

        return response()->json([
            'staff' => $staff,
            'permissions' => $staff->getAllPermissions(),
        ]);
    }

    /**
     * Update the specified staff account details.
     */
    public function update(UpdateStaffRequest $request, int $id): JsonResponse
    {
        $staff = User::findOrFail($id);
        $data = $request->validated();

        // Anti-lockout: Prevent demoting the last active administrator
        if (isset($data['role']) && $data['role'] !== 'admin' && $staff->isAdmin()) {
            $activeAdminCount = User::where('role', 'admin')->where('is_active', true)->count();
            if ($activeAdminCount <= 1) {
                return response()->json([
                    'message' => 'Cannot demote the last active administrator. Create or promote another administrator first.',
                ], 422);
            }
        }

        $staff->update($data);

        SecurityAuditLogger::log('staff.updated', "Admin updated staff account #{$staff->id}", [
            'staff_id' => $staff->id,
            'changes' => array_keys($data),
        ]);

        return response()->json([
            'message' => 'Staff account updated successfully.',
            'staff' => $staff,
        ]);
    }

    /**
     * Deactivate or reactivate a staff account.
     */
    public function toggleActive(Request $request, int $id): JsonResponse
    {
        $staff = User::findOrFail($id);
        $currentUser = $request->user();

        // Anti-lockout: Admin cannot deactivate their own account
        if ($currentUser && $currentUser->id === $staff->id) {
            return response()->json([
                'message' => 'Security restriction: You cannot deactivate your own account.',
            ], 422);
        }

        // Anti-lockout: Cannot deactivate the last active administrator
        if ($staff->isAdmin() && $staff->isActive()) {
            $activeAdminCount = User::where('role', 'admin')->where('is_active', true)->count();
            if ($activeAdminCount <= 1) {
                return response()->json([
                    'message' => 'Cannot deactivate the last active administrator. Another active administrator must exist.',
                ], 422);
            }
        }

        $newActiveState = ! $staff->isActive();
        $staff->update(['is_active' => $newActiveState]);

        // If deactivating, immediately revoke all active Sanctum tokens
        if (! $newActiveState) {
            $staff->tokens()->delete();
        }

        $actionText = $newActiveState ? 'reactivated' : 'deactivated';

        SecurityAuditLogger::log("staff.{$actionText}", "Admin {$actionText} staff account #{$staff->id} ({$staff->email})", [
            'staff_id' => $staff->id,
            'new_status' => $newActiveState ? 'active' : 'deactivated',
        ]);

        return response()->json([
            'message' => "Staff account successfully {$actionText}.",
            'staff' => $staff,
        ]);
    }

    /**
     * Reset a staff member's password.
     */
    public function resetPassword(ResetStaffPasswordRequest $request, int $id): JsonResponse
    {
        $staff = User::findOrFail($id);

        $staff->update([
            'password' => Hash::make($request->input('password')),
        ]);

        // Invalidate all existing tokens so the user is forced to re-authenticate with the new password
        $staff->tokens()->delete();

        SecurityAuditLogger::log('staff.password_reset', "Admin initiated password reset for staff #{$staff->id} ({$staff->email})", [
            'staff_id' => $staff->id,
        ]);

        return response()->json([
            'message' => "Password for {$staff->name} was successfully reset. Existing sessions have been terminated.",
        ]);
    }
}
