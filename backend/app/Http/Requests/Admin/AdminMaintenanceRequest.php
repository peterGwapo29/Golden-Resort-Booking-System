<?php

namespace App\Http\Requests\Admin;

use App\Models\MaintenanceRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminMaintenanceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        if ($this->isMethod('post') && ! $this->route('id')) {
            return $user->hasPermission('maintenance.view') || $user->hasPermission('maintenance.manage');
        }

        return $user->hasPermission('maintenance.manage');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $isUpdate = $this->isMethod('put') || $this->isMethod('patch') || ($this->isMethod('post') && $this->route('id'));

        return [
            'title' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => [$isUpdate ? 'sometimes' : 'required', 'string'],
            'resource_type' => [$isUpdate ? 'sometimes' : 'required', 'string', Rule::in(MaintenanceRequest::RESOURCE_TYPES)],
            'room_id' => ['nullable', 'exists:rooms,id'],
            'resource_name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'priority' => ['nullable', 'string', Rule::in(MaintenanceRequest::PRIORITIES)],
            'status' => ['nullable', 'string', Rule::in(MaintenanceRequest::STATUSES)],
            'cost_php' => ['nullable', 'numeric', 'min:0'],
            'repair_notes' => ['nullable', 'string'],
            'assigned_to_user_id' => ['nullable', 'exists:users,id'],
            'attachments' => ['nullable', 'array'],
            'attachments.*' => ['file', 'mimes:jpeg,png,jpg,webp,pdf', 'max:10240'],
        ];
    }
}
