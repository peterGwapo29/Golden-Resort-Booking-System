<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class MaintenanceRequest extends Model
{
    use HasFactory;

    /**
     * The supported priorities.
     */
    public const PRIORITIES = [
        'low',
        'normal',
        'high',
        'urgent',
    ];

    /**
     * The supported statuses.
     */
    public const STATUSES = [
        'reported',
        'assessed',
        'assigned',
        'acknowledged',
        'in_progress',
        'on_hold',
        'pending_review',
        'resolved',
        'cancelled',
    ];

    /**
     * The supported resource types.
     */
    public const RESOURCE_TYPES = [
        'room',
        'villa',
        'facility',
        'equipment',
        'other',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tracking_number',
        'title',
        'description',
        'resource_type',
        'room_id',
        'resource_name',
        'location',
        'priority',
        'status',
        'cost_php',
        'repair_notes',
        'reported_by_user_id',
        'assigned_to_user_id',
        'due_date',
        'reported_at',
        'assigned_at',
        'acknowledged_at',
        'started_at',
        'submitted_for_review_at',
        'resolved_at',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'is_overdue',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cost_php' => 'decimal:2',
            'due_date' => 'datetime',
            'reported_at' => 'datetime',
            'assigned_at' => 'datetime',
            'acknowledged_at' => 'datetime',
            'started_at' => 'datetime',
            'submitted_for_review_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::creating(function (MaintenanceRequest $request) {
            if (empty($request->tracking_number)) {
                $datePrefix = date('Ymd');
                do {
                    $randomSuffix = strtoupper(Str::random(4));
                    $trackingNumber = "MNT-{$datePrefix}-{$randomSuffix}";
                } while (static::where('tracking_number', $trackingNumber)->exists());

                $request->tracking_number = $trackingNumber;
            }

            if (empty($request->reported_at)) {
                $request->reported_at = now();
            }
        });
    }

    /**
     * Get the associated room or villa.
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * Get the staff/admin user who reported the request.
     */
    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by_user_id');
    }

    /**
     * Get the staff member assigned to work on the request.
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_user_id');
    }

    /**
     * Get the attachments associated with this request.
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(MaintenanceRequestAttachment::class);
    }

    /**
     * Get the chronological history log for this request.
     */
    public function history(): HasMany
    {
        return $this->hasMany(MaintenanceRequestHistory::class)->orderBy('id', 'desc');
    }

    /**
     * Determine if this request is overdue according to its deadline or SLA.
     */
    public function getIsOverdueAttribute(): bool
    {
        if (in_array($this->status, ['resolved', 'cancelled'], true)) {
            return false;
        }

        if ($this->due_date) {
            return now()->isAfter($this->due_date);
        }

        $baseTime = $this->assigned_at ?? $this->reported_at ?? $this->created_at;
        if (! $baseTime) {
            return false;
        }

        return match ($this->priority) {
            'urgent' => now()->diffInHours($baseTime) >= 24,
            'high' => now()->diffInHours($baseTime) >= 48,
            'normal' => now()->diffInDays($baseTime) >= 5,
            'low' => now()->diffInDays($baseTime) >= 10,
            default => false,
        };
    }

    /**
     * Scope to active (non-resolved, non-cancelled) requests.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNotIn('status', ['resolved', 'cancelled']);
    }

    /**
     * Scope to requests assigned to a specific user.
     */
    public function scopeAssignedToUser(Builder $query, int $userId): Builder
    {
        return $query->where('assigned_to_user_id', $userId);
    }

    /**
     * Scope to requests awaiting completion review.
     */
    public function scopePendingReview(Builder $query): Builder
    {
        return $query->where('status', 'pending_review');
    }

    /**
     * Scope to overdue requests.
     */
    public function scopeOverdue(Builder $query): Builder
    {
        return $query->whereNotIn('status', ['resolved', 'cancelled'])
            ->where(function ($q) {
                $q->whereNotNull('due_date')->where('due_date', '<', now())
                    ->orWhere(function ($sla) {
                        $sla->whereNull('due_date')
                            ->where(function ($sub) {
                                $sub->where('priority', 'urgent')->where('reported_at', '<=', now()->subHours(24))
                                    ->orWhere('priority', 'high')->where('reported_at', '<=', now()->subHours(48))
                                    ->orWhere('priority', 'normal')->where('reported_at', '<=', now()->subDays(5))
                                    ->orWhere('priority', 'low')->where('reported_at', '<=', now()->subDays(10));
                            });
                    });
            });
    }

    /**
     * Scope query by status.
     */
    public function scopeByStatus(Builder $query, ?string $status): Builder
    {
        if ($status && $status !== 'all') {
            return $query->where('status', $status);
        }

        return $query;
    }

    /**
     * Scope query by priority.
     */
    public function scopeByPriority(Builder $query, ?string $priority): Builder
    {
        if ($priority && $priority !== 'all') {
            return $query->where('priority', $priority);
        }

        return $query;
    }

    /**
     * Scope query by resource type.
     */
    public function scopeByResourceType(Builder $query, ?string $resourceType): Builder
    {
        if ($resourceType && $resourceType !== 'all') {
            return $query->where('resource_type', $resourceType);
        }

        return $query;
    }

    /**
     * Availability restrictions linked to this maintenance request.
     */
    public function restrictions(): HasMany
    {
        return $this->hasMany(AccommodationRestriction::class);
    }

    /**
     * Active availability restrictions linked to this maintenance request.
     */
    public function activeRestrictions(): HasMany
    {
        return $this->hasMany(AccommodationRestriction::class)->where('status', 'active');
    }
}
