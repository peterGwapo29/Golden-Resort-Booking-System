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
            'featured_image' => $this->featured_image,
            'featuredImage' => $this->featured_image,
            'gallery' => $this->gallery,
        ];
    }
}
