<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceRequestHistory extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'maintenance_request_id',
        'user_id',
        'actor_role',
        'action',
        'from_status',
        'to_status',
        'from_assigned_to_user_id',
        'to_assigned_to_user_id',
        'notes',
        'changes_payload',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'changes_payload' => 'array',
        ];
    }

    /**
     * Boot model to enforce strict immutability on audit logs.
     */
    protected static function booted(): void
    {
        static::updating(function () {
            throw new \RuntimeException('Maintenance audit logs are immutable and cannot be updated.');
        });

        static::deleting(function () {
            throw new \RuntimeException('Maintenance audit logs are immutable and cannot be deleted.');
        });
    }

    /**
     * Get the maintenance request that owns this history log.
     */
    public function maintenanceRequest(): BelongsTo
    {
        return $this->belongsTo(MaintenanceRequest::class);
    }

    /**
     * Get the user who performed this action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the previous staff member assigned.
     */
    public function fromAssignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_assigned_to_user_id');
    }

    /**
     * Get the new staff member assigned.
     */
    public function toAssignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_assigned_to_user_id');
    }
}
