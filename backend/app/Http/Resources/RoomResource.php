<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $rate = (float) $this->nightly_rate_php;

        $fallbackImage = [
            'src' => 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80',
            'alt' => $this->name.' accommodation view',
            'source' => 'fallback',
        ];

        $resolveImage = function ($img) use ($fallbackImage) {
            if (empty($img) || ! is_array($img)) {
                return $fallbackImage;
            }

            if (! empty($img['path'])) {
                if (\Illuminate\Support\Facades\Storage::disk('public')->exists($img['path'])) {
                    $img['src'] = \Illuminate\Support\Facades\Storage::disk('public')->url($img['path']);

                    return $img;
                }

                // File does not exist on disk: handle missing file safely with fallback
                return array_merge($img, [
                    'src' => $fallbackImage['src'],
                    'source' => 'fallback',
                ]);
            }

            if (! empty($img['src'])) {
                return $img;
            }

            return $fallbackImage;
        };

        $featuredImage = $resolveImage($this->featured_image);

        $rawGallery = is_array($this->gallery) && count($this->gallery) > 0
            ? $this->gallery
            : [$featuredImage];
        $gallery = array_values(array_map($resolveImage, $rawGallery));

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'category' => $this->category,
            'tagline' => $this->tagline,
            'description' => $this->description,
            'long_description' => $this->long_description,
            'longDescription' => $this->long_description,
            'nightly_rate_php' => $rate,
            'nightlyRatePhp' => $rate,
            'sampleRatePhp' => $rate,
            'total_inventory' => (int) $this->total_inventory,
            'max_guests' => (int) $this->max_guests,
            'maxGuests' => (int) $this->max_guests,
            'adults_capacity' => (int) $this->adults_capacity,
            'adultsCapacity' => (int) $this->adults_capacity,
            'children_capacity' => (int) $this->children_capacity,
            'childrenCapacity' => (int) $this->children_capacity,
            'bed_configuration' => $this->bed_configuration,
            'bedConfiguration' => $this->bed_configuration,
            'size_sqm' => (int) $this->size_sqm,
            'sizeSqm' => (int) $this->size_sqm,
            'view' => $this->view,
            'amenities' => $this->amenities,
            'image_url' => $featuredImage['src'],
            'imageUrl' => $featuredImage['src'],
            'featured_image' => $featuredImage,
            'featuredImage' => $featuredImage,
            'gallery' => $gallery,
            'is_active' => (bool) $this->is_active,
            'isActive' => (bool) $this->is_active,
        ];
    }
}
