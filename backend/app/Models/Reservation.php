<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
     * Scope reservations that block inventory.
     */
    public function scopeBlocksInventory(Builder $query): Builder
    {
        return $query->whereIn('status', ['pending', 'confirmed']);
    }

    /**
     * Scope reservations overlapping the given date range.
     */
    public function scopeOverlapping(Builder $query, string $checkIn, string $checkOut): Builder
    {
        return $query->where('check_in', '<', $checkOut)
            ->where('check_out', '>', $checkIn);
    }
}
