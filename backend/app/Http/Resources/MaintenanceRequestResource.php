<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MaintenanceRequestResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $canManage = $user ? $user->hasPermission('maintenance.manage') : false;
        $isAssigned = $user && $this->assigned_to_user_id === $user->id;

        return [
            'id' => $this->id,
            'tracking_number' => $this->tracking_number,
            'title' => $this->title,
            'description' => $this->description,
            'resource_type' => $this->resource_type,
            'room_id' => $this->room_id,
            'room' => $this->room ? [
                'id' => $this->room->id,
                'name' => $this->room->name,
                'category' => $this->room->category,
                'housekeeping_status' => $this->room->housekeeping_status,
            ] : null,
            'resource_name' => $this->resource_name,
            'location' => $this->location,
            'priority' => $this->priority,
            'status' => $this->status,
            'cost_php' => (float) $this->cost_php,
            'repair_notes' => $this->repair_notes,
            'due_date' => $this->due_date?->toISOString(),
            'is_overdue' => (bool) $this->is_overdue,
            'reported_by' => $this->reportedBy ? [
                'id' => $this->reportedBy->id,
                'name' => $this->reportedBy->name,
                'email' => $this->reportedBy->email,
                'role' => $this->reportedBy->role,
            ] : null,
            'assigned_to' => $this->assignedTo ? [
                'id' => $this->assignedTo->id,
                'name' => $this->assignedTo->name,
                'email' => $this->assignedTo->email,
                'role' => $this->assignedTo->role,
                'department' => $this->assignedTo->department,
            ] : null,
            'capabilities' => [
                'can_assign' => $canManage,
                'can_acknowledge' => $isAssigned && $this->status === 'assigned',
                'can_start' => ($isAssigned || $canManage) && in_array($this->status, ['assigned', 'acknowledged', 'reported'], true),
                'can_update_progress' => ($isAssigned || $canManage) && in_array($this->status, ['in_progress', 'on_hold'], true),
                'can_submit_review' => ($isAssigned || $canManage) && $this->status === 'in_progress',
                'can_review' => $canManage && $this->status === 'pending_review',
                'can_resolve' => $canManage,
            ],
            'attachments' => $this->attachments ? $this->attachments->map(function ($att) {
                return [
                    'id' => $att->id,
                    'file_name' => $att->file_name,
                    'file_path' => $att->file_path,
                    'file_type' => $att->file_type,
                    'file_size' => $att->file_size,
                    'url' => $att->url,
                    'created_at' => $att->created_at?->toISOString(),
                ];
            }) : [],
            'history' => $this->relationLoaded('history') ? $this->history->map(function ($h) {
                return [
                    'id' => $h->id,
                    'action' => $h->action,
                    'actor_role' => $h->actor_role ?? $h->user?->role,
                    'from_status' => $h->from_status,
                    'to_status' => $h->to_status,
                    'notes' => $h->notes,
                    'changes_payload' => $h->changes_payload,
                    'user' => $h->user ? [
                        'id' => $h->user->id,
                        'name' => $h->user->name,
                        'role' => $h->user->role,
                    ] : null,
                    'from_assigned_to' => $h->fromAssignedTo ? [
                        'id' => $h->fromAssignedTo->id,
                        'name' => $h->fromAssignedTo->name,
                    ] : null,
                    'to_assigned_to' => $h->toAssignedTo ? [
                        'id' => $h->toAssignedTo->id,
                        'name' => $h->toAssignedTo->name,
                    ] : null,
                    'created_at' => $h->created_at?->toISOString(),
                ];
            }) : [],
            'reported_at' => $this->reported_at?->toISOString(),
            'assigned_at' => $this->assigned_at?->toISOString(),
            'acknowledged_at' => $this->acknowledged_at?->toISOString(),
            'started_at' => $this->started_at?->toISOString(),
            'submitted_for_review_at' => $this->submitted_for_review_at?->toISOString(),
            'resolved_at' => $this->resolved_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
