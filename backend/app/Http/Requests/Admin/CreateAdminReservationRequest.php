<?php

namespace App\Http\Requests\Admin;

use App\Models\Room;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class CreateAdminReservationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('reservations.manage') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'room_id' => ['required', 'integer', Rule::exists('rooms', 'id')->where('is_active', true)],
            'check_in' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'check_out' => ['required', 'date_format:Y-m-d', 'after:check_in'],
            'adults' => ['required', 'integer', 'min:1', 'max:10'],
            'children' => ['nullable', 'integer', 'min:0', 'max:10'],
            'guest_full_name' => ['required', 'string', 'min:2', 'max:150'],
            'guest_email' => ['required', 'string', 'email', 'max:150'],
            'guest_phone' => ['required', 'string', 'min:7', 'max:25'],
            'booking_source' => ['required', 'string', 'in:walk_in,phone,front_desk,corporate,ota'],
            'status' => ['nullable', 'string', 'in:pending,confirmed'],
            'special_requests' => ['nullable', 'string', 'max:1000'],

            // Optional atomic initial payment details
            'initial_payment' => ['nullable', 'array'],
            'initial_payment.amount' => ['required_with:initial_payment', 'numeric', 'min:0.01'],
            'initial_payment.payment_method' => ['required_with:initial_payment', 'string', 'in:cash,bank_transfer,credit_card,credit_card_terminal,e_wallet,other'],
            'initial_payment.notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $roomId = $this->input('room_id');
            $adults = (int) $this->input('adults', 0);
            $children = (int) $this->input('children', 0);

            if ($roomId && $adults > 0) {
                $room = Room::where('id', $roomId)->where('is_active', true)->first();
                if ($room) {
                    $total = $adults + $children;
                    if ($total > $room->max_guests) {
                        $v->errors()->add(
                            'guests',
                            "{$room->name} accommodates up to {$room->max_guests} guests ({$total} specified)."
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
            'room_id.exists' => 'The selected accommodation is inactive or does not exist.',
            'check_in.after_or_equal' => 'Check-in date cannot be in the past.',
            'check_out.after' => 'Check-out date must be at least one day after check-in.',
            'guest_full_name.required' => 'Primary guest full name is required.',
            'guest_email.required' => 'Primary guest email address is required.',
            'guest_email.email' => 'Please provide a valid email address.',
            'guest_phone.required' => 'Contact phone number is required.',
            'booking_source.required' => 'Please select a booking source (e.g. Walk-In, Phone).',
            'booking_source.in' => 'Invalid booking source selected.',
        ];
    }
}
