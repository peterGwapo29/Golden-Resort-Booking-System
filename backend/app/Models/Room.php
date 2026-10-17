<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'slug',
        'name',
        'category',
        'tagline',
        'description',
        'long_description',
        'nightly_rate_php',
        'total_inventory',
        'max_guests',
        'adults_capacity',
        'children_capacity',
        'bed_configuration',
        'size_sqm',
        'view',
        'amenities',
        'featured_image',
        'gallery',
        'is_active',
        'housekeeping_status',
        'last_cleaned_at',
        'last_inspected_at',
        'housekeeping_notes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'long_description' => 'array',
            'nightly_rate_php' => 'decimal:2',
            'total_inventory' => 'integer',
            'max_guests' => 'integer',
            'adults_capacity' => 'integer',
            'children_capacity' => 'integer',
            'size_sqm' => 'integer',
            'amenities' => 'array',
            'featured_image' => 'array',
            'gallery' => 'array',
            'is_active' => 'boolean',
            'last_cleaned_at' => 'datetime',
            'last_inspected_at' => 'datetime',
        ];
    }

    /**
     * Scope a query to only include active rooms that are not under maintenance.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where('housekeeping_status', '!=', 'maintenance');
    }

    /**
     * Get reservations for this room.
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    /**
     * Get housekeeping tasks for this room.
     */
    public function housekeepingTasks(): HasMany
    {
        return $this->hasMany(HousekeepingTask::class);
    }

    /**
     * Determine if room is certified ready for guest check-in.
     */
    public function getIsReadyForGuestAttribute(): bool
    {
        return $this->housekeeping_status === 'inspected';
    }

    /**
     * Determine if room is currently under maintenance.
     */
    public function getIsUnderMaintenanceAttribute(): bool
    {
        return $this->housekeeping_status === 'maintenance';
    }
}
