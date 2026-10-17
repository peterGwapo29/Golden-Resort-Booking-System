<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reservation extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'booking_reference',
        'room_id',
        'guest_id',
        'check_in',
        'check_out',
        'adults',
        'children',
        'total_guests',
        'nights',
        'nightly_rate_php',
        'total_price_php',
        'currency',
        'status',
        'special_requests',
        'guest_name_snapshot',
        'guest_email_snapshot',
        'guest_phone_snapshot',
        'checked_in_at',
        'checked_out_at',
        'checked_in_by_user_id',
        'checked_out_by_user_id',
        'check_in_notes',
        'check_out_notes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'check_in' => 'date:Y-m-d',
            'check_out' => 'date:Y-m-d',
            'adults' => 'integer',
            'children' => 'integer',
            'total_guests' => 'integer',
            'nights' => 'integer',
            'nightly_rate_php' => 'decimal:2',
            'total_price_php' => 'decimal:2',
            'checked_in_at' => 'datetime',
            'checked_out_at' => 'datetime',
        ];
    }

    /**
     * Get the room for this reservation.
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * Get the guest for this reservation.
     */
    public function guest(): BelongsTo
    {
        return $this->belongsTo(Guest::class);
    }

    /**
     * Get payments recorded for this reservation.
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Get refunds recorded for this reservation.
     */
    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    /**
     * Calculate total verified net paid amount applied to this reservation.
     */
    public function totalPaid(): float
    {
        return app(\App\Services\FinancialCalculationService::class)->netCollections($this->id);
    }

    /**
     * Determine standardized payment status: 'paid', 'partially_paid', or 'unpaid'.
     */
    public function paymentStatus(): string
    {
        return app(\App\Services\FinancialCalculationService::class)->paymentStatus($this);
    }

    /**
     * Get the user who processed guest check-in.
     */
    public function checkedInBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_in_by_user_id');
    }

    /**
     * Get the user who processed guest check-out.
     */
    public function checkedOutBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_out_by_user_id');
    }

    /**
     * Scope reservations that block inventory.
     */
    public function scopeBlocksInventory(Builder $query): Builder
    {
        return $query->whereIn('status', ['pending', 'confirmed', 'checked_in']);
    }

    /**
     * Scope reservations overlapping the given date range.
     */
    public function scopeOverlapping(Builder $query, string $checkIn, string $checkOut): Builder
    {
        return $query->where('check_in', '<', $checkOut)
            ->where('check_out', '>', $checkIn);
    }

    /**
     * Determine if guest is currently checked in.
     */
    public function getIsCheckedInAttribute(): bool
    {
        return $this->status === 'checked_in';
    }

    /**
     * Determine if reservation has completed stay and checked out.
     */
    public function getIsCompletedAttribute(): bool
    {
        return $this->status === 'completed';
    }
}
