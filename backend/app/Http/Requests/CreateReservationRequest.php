<?php

namespace App\Http\Requests;

use App\Models\Room;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class CreateReservationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'room_slug' => ['required', 'string', 'exists:rooms,slug'],
            'check_in' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'check_out' => ['required', 'date_format:Y-m-d', 'after:check_in'],
            'adults' => ['required', 'integer', 'min:1', 'max:10'],
            'children' => ['nullable', 'integer', 'min:0', 'max:10'],
            'guest_full_name' => ['required', 'string', 'min:2', 'max:150'],
            'guest_email' => ['required', 'string', 'email', 'max:150'],
            'guest_phone' => ['required', 'string', 'min:7', 'max:25'],
            'special_requests' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $roomSlug = $this->input('room_slug');
            $adults = (int) $this->input('adults', 0);
            $children = (int) $this->input('children', 0);

            if ($roomSlug && $adults > 0) {
                $room = Room::where('slug', $roomSlug)->where('is_active', true)->first();
                if ($room) {
                    $total = $adults + $children;
                    if ($total > $room->max_guests) {
                        $v->errors()->add(
                            'guests',
                            "{$room->name} accommodates up to {$room->max_guests} guests ({$total} selected)."
                        );
                    }
                }
            }
        });
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'room_slug.exists' => 'The selected room is invalid or unavailable.',
            'check_in.after_or_equal' => 'Check-in date cannot be in the past.',
            'check_out.after' => 'Check-out date must be at least one day after check-in.',
            'guest_full_name.required' => 'Full name is required.',
            'guest_email.required' => 'Email address is required.',
            'guest_email.email' => 'Please provide a valid email address.',
            'guest_phone.required' => 'Contact phone number is required.',
        ];
    }
}
