<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'booking_reference' => $this->booking_reference,
            'status' => $this->status,
            'booking_source' => $this->booking_source ?? 'website',
            'created_by' => $this->createdBy ? [
                'id' => $this->createdBy->id,
                'name' => $this->createdBy->name,
                'role' => $this->createdBy->role,
            ] : null,
            'check_in' => $this->check_in instanceof \DateTimeInterface ? $this->check_in->format('Y-m-d') : (string) $this->check_in,
            'check_out' => $this->check_out instanceof \DateTimeInterface ? $this->check_out->format('Y-m-d') : (string) $this->check_out,
            'nights' => (int) $this->nights,
            'adults' => (int) $this->adults,
            'children' => (int) $this->children,
            'total_guests' => (int) $this->total_guests,
            'nightly_rate_php' => (float) $this->nightly_rate_php,
            'total_price_php' => (float) $this->total_price_php,
            'currency' => $this->currency ?? 'PHP',
            'guest_name_snapshot' => $this->guest_name_snapshot ?? $this->guest?->full_name,
            'guest_email_snapshot' => $this->guest_email_snapshot ?? $this->guest?->email,
            'guest_phone_snapshot' => $this->guest_phone_snapshot ?? $this->guest?->phone,
            'room' => [
                'id' => $this->room?->id ?? $this->room_id,
                'slug' => $this->room?->slug,
                'name' => $this->room?->name,
                'category' => $this->room?->category,
                'nightly_rate_php' => (float) $this->nightly_rate_php,
            ],
            'guest' => [
                'full_name' => $this->guest_name_snapshot ?? $this->guest?->full_name,
                'email' => $this->guest_email_snapshot ?? $this->guest?->email,
                'phone' => $this->guest_phone_snapshot ?? $this->guest?->phone,
            ],
            'stay' => [
                'check_in' => $this->check_in instanceof \DateTimeInterface ? $this->check_in->format('Y-m-d') : (string) $this->check_in,
                'check_out' => $this->check_out instanceof \DateTimeInterface ? $this->check_out->format('Y-m-d') : (string) $this->check_out,
                'nights' => (int) $this->nights,
                'adults' => (int) $this->adults,
                'children' => (int) $this->children,
                'total_guests' => (int) $this->total_guests,
            ],
            'pricing' => [
                'nightly_rate_php' => (float) $this->nightly_rate_php,
                'total_price_php' => (float) $this->total_price_php,
                'currency' => $this->currency,
            ],
            'special_requests' => $this->special_requests,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
