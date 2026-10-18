<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccommodationRestriction extends Model
{
    use HasFactory;

    /**
     * Supported restriction types.
     */
    public const TYPES = [
        'maintenance_block',
        'emergency_repair',
        'scheduled_renovation',
        'safety_hazard',
        'operational_hold',
    ];

    /**
     * Supported statuses.
     */
    public const STATUSES = [
        'active',
        'cleared',
        'cancelled',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'restriction_number',
        'room_id',
        'maintenance_request_id',
        'restriction_type',
        'title',
        'reason',
        'blocked_units',
        'start_date',
        'end_date',
        'is_indefinite',
        'status',
        'affected_reservations_snapshot',
        'handling_protocol',
        'created_by_user_id',
        'cleared_by_user_id',
        'cleared_at',
        'clearance_notes',
        'cancellation_reason',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'is_indefinite' => 'boolean',
            'blocked_units' => 'integer',
            'cleared_at' => 'datetime',
            'affected_reservations_snapshot' => 'array',
        ];
    }

    /**
     * The accommodation this restriction applies to.
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * Optional maintenance request associated with this restriction.
     */
    public function maintenanceRequest(): BelongsTo
    {
        return $this->belongsTo(MaintenanceRequest::class);
    }

    /**
     * User who placed the restriction.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * User who issued clearance and restored availability.
     */
    public function clearedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cleared_by_user_id');
    }

    /**
     * Scope only active restrictions.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope restrictions that overlap the given stay date range [checkIn, checkOut).
     * Half-open interval convention: a stay checks in on checkIn and checks out on checkOut.
     */
    public function scopeOverlapping(Builder $query, string $checkIn, string $checkOut): Builder
    {
        return $query->where('start_date', '<', $checkOut)
            ->where(function ($q) use ($checkIn) {
                $q->whereNull('end_date')
                    ->orWhere('end_date', '>', $checkIn);
            });
    }

    /**
     * Scope restrictions for a specific accommodation.
     */
    public function scopeForRoom(Builder $query, int $roomId): Builder
    {
        return $query->where('room_id', $roomId);
    }

    /**
     * Determine if this restriction is currently active.
     */
    public function getIsActiveAttribute(): bool
    {
        return $this->status === 'active';
    }
}
