<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'reservation_id',
        'payment_reference',
        'amount',
        'currency',
        'payment_method',
        'status',
        'notes',
        'recorded_by_user_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    /**
     * Get the reservation that this payment belongs to.
     */
    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    /**
     * Get the administrator who recorded this payment.
     */
    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by_user_id');
    }

    /**
     * Get the refunds issued against this payment.
     */
    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    /**
     * Get only completed refunds.
     */
    public function completedRefunds(): HasMany
    {
        return $this->hasMany(Refund::class)->where('status', 'completed');
    }

    /**
     * Calculate total amount completed refunded for this payment.
     */
    public function completedRefundsTotal(): float
    {
        return (float) $this->refunds()->where('status', 'completed')->sum('amount');
    }

    /**
     * Calculate remaining refundable amount for this payment.
     * Active refunds (completed + pending) reserve the refundable capacity.
     */
    public function remainingRefundable(): float
    {
        if ($this->status !== 'completed') {
            return 0.00;
        }

        $activeRefunds = (float) $this->refunds()
            ->whereIn('status', ['completed', 'pending'])
            ->sum('amount');

        return max(0, round((float) $this->amount - $activeRefunds, 2));
    }
}
