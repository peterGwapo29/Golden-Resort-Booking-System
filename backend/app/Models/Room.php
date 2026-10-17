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
        ];
    }

    /**
     * Scope a query to only include active rooms.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Get reservations for this room.
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }
}
