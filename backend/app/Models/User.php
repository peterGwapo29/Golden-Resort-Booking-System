<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The supported system roles.
     *
     * @var array<int, string>
     */
    public const ROLES = [
        'admin',
        'manager',
        'front_desk',
        'housekeeper',
        'maintenance',
        'staff',
    ];

    /**
     * Permissions mapped to allowed roles.
     *
     * @var array<string, array<int, string>>
     */
    public const PERMISSION_MATRIX = [
        'staff.manage' => ['admin'],
        'analytics.view' => ['admin', 'manager'],
        'finance.manage' => ['admin', 'manager'],
        'rooms.manage' => ['admin', 'manager'],
        'rooms.view' => ['admin', 'manager', 'front_desk', 'housekeeper', 'maintenance', 'staff'],
        'reservations.manage' => ['admin', 'manager', 'front_desk'],
        'reservations.view' => ['admin', 'manager', 'front_desk'],
        'checkin.manage' => ['admin', 'manager', 'front_desk'],
        'housekeeping.manage' => ['admin', 'manager', 'housekeeper'],
        'maintenance.manage' => ['admin', 'manager'],
        'maintenance.view' => ['admin', 'manager', 'maintenance'],
        'notifications.view' => ['admin', 'manager'],
    ];

    /**
     * The model's default values for attributes.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'is_active' => true,
        'role' => 'staff',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'phone',
        'department',
        'notes',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    /**
     * Determine if the user is an administrator.
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Determine if the user is a resort staff or management personnel.
     */
    public function isStaff(): bool
    {
        return in_array($this->role, self::ROLES, true);
    }

    /**
     * Determine if the account is active.
     */
    public function isActive(): bool
    {
        return (bool) $this->is_active;
    }

    /**
     * Check if user has specific role or one of given roles.
     *
     * @param  string|array<int, string>  $roles
     */
    public function hasRole(string|array $roles): bool
    {
        $roleList = is_array($roles) ? $roles : [$roles];

        return in_array($this->role, $roleList, true);
    }

    /**
     * Determine if user has a specific permission.
     */
    public function hasPermission(string $permission): bool
    {
        // Admins inherit all permissions
        if ($this->isAdmin()) {
            return true;
        }

        $allowedRoles = self::PERMISSION_MATRIX[$permission] ?? [];

        return in_array($this->role, $allowedRoles, true);
    }

    /**
     * Get all permission strings granted to this user.
     *
     * @return array<int, string>
     */
    public function getAllPermissions(): array
    {
        if ($this->isAdmin()) {
            return array_keys(self::PERMISSION_MATRIX);
        }

        $permissions = [];
        foreach (self::PERMISSION_MATRIX as $perm => $roles) {
            if (in_array($this->role, $roles, true)) {
                $permissions[] = $perm;
            }
        }

        return $permissions;
    }

    /**
     * Scope to active accounts only.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to authorized staff accounts only.
     */
    public function scopeStaff($query)
    {
        return $query->whereIn('role', self::ROLES);
    }

    /**
     * Maintenance requests reported by this user.
     */
    public function reportedMaintenanceRequests(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(MaintenanceRequest::class, 'reported_by_user_id');
    }

    /**
     * Maintenance requests assigned to this user.
     */
    public function assignedMaintenanceRequests(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(MaintenanceRequest::class, 'assigned_to_user_id');
    }

    /**
     * Housekeeping tasks assigned to this user.
     */
    public function assignedHousekeepingTasks(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(HousekeepingTask::class, 'assigned_to_user_id');
    }
}
