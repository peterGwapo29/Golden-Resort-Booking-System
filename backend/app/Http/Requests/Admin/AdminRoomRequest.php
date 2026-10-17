<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminRoomRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->long_description)) {
            $decoded = json_decode($this->long_description, true);
            if (is_array($decoded)) {
                $this->merge(['long_description' => $decoded]);
            }
        }

        if (is_string($this->amenities)) {
            $decoded = json_decode($this->amenities, true);
            if (is_array($decoded)) {
                $this->merge(['amenities' => $decoded]);
            }
        }

        if (is_string($this->gallery)) {
            $decoded = json_decode($this->gallery, true);
            if (is_array($decoded)) {
                $this->merge(['gallery' => $decoded]);
            }
        }

        if (is_string($this->featured_image)) {
            $decoded = json_decode($this->featured_image, true);
            if (is_array($decoded)) {
                $this->merge(['featured_image' => $decoded]);
            }
        }

        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => filter_var($this->is_active, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true,
            ]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $roomId = $this->route('room')?->id ?? $this->route('id');

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', Rule::unique('rooms', 'slug')->ignore($roomId)],
            'category' => ['required', 'string', 'in:room,suite,villa'],
            'tagline' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'long_description' => ['required', 'array', 'min:1'],
            'long_description.*' => ['required', 'string'],
            'nightly_rate_php' => ['required', 'numeric', 'min:1'],
            'total_inventory' => ['required', 'integer', 'min:1', 'max:100'],
            'max_guests' => ['required', 'integer', 'min:1', 'max:20'],
            'adults_capacity' => ['required', 'integer', 'min:1', 'max:20'],
            'children_capacity' => ['required', 'integer', 'min:0', 'max:20'],
            'bed_configuration' => ['required', 'string', 'max:255'],
            'size_sqm' => ['required', 'integer', 'min:1'],
            'view' => ['required', 'string', 'max:255'],
            'amenities' => ['required', 'array'],
            'amenities.*' => ['required', 'string'],
            'image' => ['nullable', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'image_alt' => ['nullable', 'string', 'max:255'],
            'featured_image' => ['nullable', 'array'],
            'featured_image.src' => ['nullable', 'string'],
            'featured_image.alt' => ['nullable', 'string'],
            'gallery' => ['nullable', 'array'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Get custom error messages for validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'image.image' => 'The uploaded file must be an actual image.',
            'image.mimes' => 'The accommodation image must be a file of type: jpeg, jpg, png, webp.',
            'image.max' => 'The accommodation image may not be greater than 5 megabytes.',
        ];
    }
}
