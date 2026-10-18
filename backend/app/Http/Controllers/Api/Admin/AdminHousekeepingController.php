<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HousekeepingTask;
use App\Models\HousekeepingTaskHistory;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class AdminHousekeepingController extends Controller
{
    /**
     * Display a list of all accommodations with their current housekeeping condition,
     * active task, cleaning timestamps, and operational metrics.
     */
    public function rooms(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'housekeeping_status' => ['nullable', 'string', 'in:all,clean,dirty,in_progress,inspected,maintenance'],
            'category' => ['nullable', 'string', 'in:all,room,suite,villa'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $query = Room::query()->with([
            'housekeepingTasks' => function ($q) {
                $q->whereIn('status', ['pending', 'in_progress', 'pending_review'])
                    ->with('assignedTo:id,name,email,role')
                    ->latest('id');
            },
        ]);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%");
        }

        if ($request->filled('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('housekeeping_status') && $request->input('housekeeping_status') !== 'all') {
            $query->where('housekeeping_status', $request->input('housekeeping_status'));
        }

        $rooms = $query->orderBy('category')->orderBy('name')->get();

        // Calculate resort-wide operational metrics
        $allRooms = Room::all(['id', 'housekeeping_status', 'is_active']);
        $metrics = [
            'total_accommodations' => $allRooms->count(),
            'clean' => $allRooms->where('housekeeping_status', 'clean')->count(),
            'dirty' => $allRooms->where('housekeeping_status', 'dirty')->count(),
            'in_progress' => $allRooms->where('housekeeping_status', 'in_progress')->count(),
            'inspected' => $allRooms->where('housekeeping_status', 'inspected')->count(),
            'maintenance' => $allRooms->where('housekeeping_status', 'maintenance')->count(),
            'active_tasks_count' => HousekeepingTask::whereIn('status', ['pending', 'in_progress', 'pending_review'])->count(),
            'pending_review_count' => HousekeepingTask::where('status', 'pending_review')->count(),
        ];

        $formattedRooms = $rooms->map(function ($room) {
            $activeTask = $room->housekeepingTasks->first();

            return [
                'id' => $room->id,
                'name' => $room->name,
                'slug' => $room->slug,
                'category' => $room->category,
                'total_inventory' => (int) $room->total_inventory,
                'nightly_rate_php' => (float) $room->nightly_rate_php,
                'is_active' => (bool) $room->is_active,
                'housekeeping_status' => $room->housekeeping_status ?? 'clean',
                'is_ready_for_guest' => $room->housekeeping_status === 'inspected',
                'is_under_maintenance' => $room->housekeeping_status === 'maintenance',
                'last_cleaned_at' => $room->last_cleaned_at?->toISOString(),
                'last_inspected_at' => $room->last_inspected_at?->toISOString(),
                'housekeeping_notes' => $room->housekeeping_notes,
                'active_task' => $activeTask ? [
                    'id' => $activeTask->id,
                    'task_type' => $activeTask->task_type,
                    'priority' => $activeTask->priority,
                    'status' => $activeTask->status,
                    'notes' => $activeTask->notes,
                    'evidence_url' => $activeTask->evidence_url,
                    'submitted_for_review_at' => $activeTask->submitted_for_review_at?->toISOString(),
                    'scheduled_date' => $activeTask->scheduled_date ? Carbon::parse($activeTask->scheduled_date)->toDateString() : null,
                    'assigned_to' => $activeTask->assignedTo ? [
                        'id' => $activeTask->assignedTo->id,
                        'name' => $activeTask->assignedTo->name,
                        'email' => $activeTask->assignedTo->email,
                    ] : null,
                ] : null,
            ];
        });

        return response()->json([
            'metrics' => $metrics,
            'rooms' => $formattedRooms,
        ]);
    }

    /**
     * Update the operational condition / housekeeping status of an accommodation.
     */
    public function updateRoomStatus(Request $request, int $roomId): JsonResponse
    {
        if ($request->user()->role !== 'admin' && $request->user()->role !== 'manager') {
            return response()->json([
                'message' => 'Access denied. Only administrators and supervisors can directly alter room operational status.',
            ], 403);
        }

        $room = Room::findOrFail($roomId);

        $validator = Validator::make($request->all(), [
            'status' => ['required', 'string', 'in:clean,dirty,in_progress,inspected,maintenance'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $newStatus = $request->input('status');
        $notes = $request->input('notes');

        DB::transaction(function () use ($room, $newStatus, $notes) {
            $room->housekeeping_status = $newStatus;

            if ($notes !== null) {
                $room->housekeeping_notes = $notes;
            }

            if ($newStatus === 'clean') {
                $room->last_cleaned_at = Carbon::now();
            } elseif ($newStatus === 'inspected') {
                $room->last_inspected_at = Carbon::now();
            }

            $room->save();
        });

        return response()->json([
            'message' => "Accommodation condition updated to '{$newStatus}'.",
            'room' => [
                'id' => $room->id,
                'name' => $room->name,
                'housekeeping_status' => $room->housekeeping_status,
                'is_ready_for_guest' => $room->housekeeping_status === 'inspected',
                'is_under_maintenance' => $room->housekeeping_status === 'maintenance',
                'last_cleaned_at' => $room->last_cleaned_at?->toISOString(),
                'last_inspected_at' => $room->last_inspected_at?->toISOString(),
                'housekeeping_notes' => $room->housekeeping_notes,
            ],
        ]);
    }

    /**
     * Get paginated list of housekeeping tasks.
     */
    public function tasks(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'room_id' => ['nullable', 'integer', 'exists:rooms,id'],
            'status' => ['nullable', 'string', 'in:all,pending,in_progress,pending_review,completed,cancelled'],
            'task_type' => ['nullable', 'string', 'in:all,cleaning,deep_clean,inspection,maintenance,turn_down'],
            'priority' => ['nullable', 'string', 'in:all,low,normal,high,urgent'],
            'assigned_to_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $query = HousekeepingTask::query()->with([
            'room:id,name,slug,category,housekeeping_status',
            'assignedTo:id,name,email,role',
            'createdBy:id,name,email',
            'history.actor:id,name,email,role',
        ]);

        $user = $request->user();
        if ($user && $user->role === 'housekeeper') {
            $query->where('assigned_to_user_id', $user->id);
        } elseif ($request->filled('assigned_to_user_id')) {
            $query->where('assigned_to_user_id', $request->input('assigned_to_user_id'));
        }

        if ($request->filled('room_id')) {
            $query->where('room_id', $request->input('room_id'));
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('task_type') && $request->input('task_type') !== 'all') {
            $query->where('task_type', $request->input('task_type'));
        }

        if ($request->filled('priority') && $request->input('priority') !== 'all') {
            $query->where('priority', $request->input('priority'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('notes', 'like', "%{$search}%")
                    ->orWhereHas('room', function ($rq) use ($search) {
                        $rq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        // Order by priority weight (urgent > high > normal > low), then scheduled date, then latest
        $tasks = $query->orderByRaw("
            CASE priority 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'normal' THEN 3 
                WHEN 'low' THEN 4 
                ELSE 5 
            END
        ")->orderBy('scheduled_date', 'asc')->latest('id')->paginate(15);

        return response()->json($tasks);
    }

    /**
     * Create and assign a new housekeeping or maintenance task.
     */
    public function storeTask(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin' && $request->user()->role !== 'manager') {
            return response()->json([
                'message' => 'Access denied. Only administrators and supervisors can assign housekeeping tasks.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'room_id' => ['required', 'integer', 'exists:rooms,id'],
            'assigned_to_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'task_type' => ['required', 'string', 'in:cleaning,deep_clean,inspection,maintenance,turn_down'],
            'priority' => ['required', 'string', 'in:low,normal,high,urgent'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'scheduled_date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $room = Room::findOrFail($request->input('room_id'));
        $taskType = $request->input('task_type');
        $notes = $request->input('notes');

        $task = DB::transaction(function () use ($request, $room, $taskType, $notes) {
            $createdTask = HousekeepingTask::create([
                'room_id' => $room->id,
                'assigned_to_user_id' => $request->input('assigned_to_user_id'),
                'created_by_user_id' => $request->user()->id,
                'task_type' => $taskType,
                'priority' => $request->input('priority'),
                'status' => 'pending',
                'notes' => $notes,
                'scheduled_date' => $request->input('scheduled_date', Carbon::today()->toDateString()),
            ]);

            HousekeepingTaskHistory::create([
                'housekeeping_task_id' => $createdTask->id,
                'actor_user_id' => $request->user()->id,
                'action' => 'assigned',
                'from_status' => null,
                'to_status' => 'pending',
                'notes' => $notes ?: 'Task assigned',
                'created_at' => Carbon::now(),
            ]);

            // If task is maintenance, automatically place room under maintenance block
            if ($taskType === 'maintenance') {
                $room->housekeeping_status = 'maintenance';
                $room->housekeeping_notes = "Maintenance task #{$createdTask->id}: ".($notes ?? 'Repair requested');
                $room->save();
            } elseif ($taskType === 'cleaning' || $taskType === 'deep_clean') {
                // If room was clean or inspected, mark dirty to reflect need for cleaning
                if (in_array($room->housekeeping_status, ['clean', 'inspected'])) {
                    $room->housekeeping_status = 'dirty';
                    $room->save();
                }
            }

            return $createdTask;
        });

        $task->load(['room', 'assignedTo', 'createdBy']);

        return response()->json([
            'message' => 'Housekeeping task assigned successfully.',
            'task' => $task,
        ], 201);
    }

    /**
     * Update task status (start task, complete, or cancel).
     */
    public function updateTaskStatus(Request $request, int $taskId): JsonResponse
    {
        $task = HousekeepingTask::with('room')->findOrFail($taskId);
        $user = $request->user();

        if ($user->role !== 'admin' && $user->role !== 'manager') {
            if ((int) $task->assigned_to_user_id !== (int) $user->id) {
                return response()->json([
                    'message' => 'Access denied. You are not authorized to modify another staff member\'s task.',
                ], 403);
            }
            if (in_array($request->input('status'), ['completed', 'cancelled'])) {
                return response()->json([
                    'message' => 'Staff cannot directly mark tasks as completed or cancelled. Please submit the task for supervisor review.',
                ], 403);
            }
        }

        $validator = Validator::make($request->all(), [
            'status' => ['required', 'string', 'in:pending,in_progress,pending_review,completed,cancelled'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $newStatus = $request->input('status');
        $notes = $request->input('notes');

        DB::transaction(function () use ($task, $newStatus, $notes, $user) {
            $fromStatus = $task->status;
            $task->status = $newStatus;

            if ($notes !== null) {
                $task->notes = $task->notes ? $task->notes."\n".$notes : $notes;
            }

            $room = $task->room;

            if ($newStatus === 'in_progress') {
                if (! $task->started_at) {
                    $task->started_at = Carbon::now();
                }
                if ($room && $room->housekeeping_status !== 'maintenance') {
                    $room->housekeeping_status = 'in_progress';
                    $room->save();
                }
            } elseif ($newStatus === 'completed') {
                $task->completed_at = Carbon::now();

                if ($room) {
                    if (in_array($task->task_type, ['cleaning', 'deep_clean', 'turn_down'])) {
                        $room->housekeeping_status = 'clean';
                        $room->last_cleaned_at = Carbon::now();
                    } elseif ($task->task_type === 'inspection') {
                        $room->housekeeping_status = 'inspected';
                        $room->last_inspected_at = Carbon::now();
                    } elseif ($task->task_type === 'maintenance') {
                        // Maintenance completed! Set room back to clean condition
                        $room->housekeeping_status = 'clean';
                        $room->housekeeping_notes = 'Maintenance resolved on '.Carbon::now()->toFormattedDateString();
                    }
                    $room->save();
                }
            }

            $task->save();

            HousekeepingTaskHistory::create([
                'housekeeping_task_id' => $task->id,
                'actor_user_id' => $user->id,
                'action' => 'status_changed',
                'from_status' => $fromStatus,
                'to_status' => $newStatus,
                'notes' => $notes ?: "Status changed to {$newStatus}",
                'created_at' => Carbon::now(),
            ]);
        });

        $task->load(['room', 'assignedTo', 'createdBy', 'history.actor:id,name,email,role']);

        return response()->json([
            'message' => "Task marked as '{$newStatus}'.",
            'task' => $task,
        ]);
    }

    /**
     * Assigned staff acknowledges and starts housekeeping work.
     */
    public function start(Request $request, int $taskId): JsonResponse
    {
        $task = HousekeepingTask::with('room')->findOrFail($taskId);
        $user = $request->user();

        if ($user->role !== 'admin' && $user->role !== 'manager' && (int) $task->assigned_to_user_id !== (int) $user->id) {
            return response()->json([
                'message' => 'Access denied. You are not authorized to start this housekeeping task.',
            ], 403);
        }

        if ($task->status === 'completed' || $task->status === 'cancelled') {
            return response()->json([
                'message' => "Cannot start task in '{$task->status}' status.",
            ], 422);
        }

        $fromStatus = $task->status;
        $task->status = 'in_progress';
        if (! $task->started_at) {
            $task->started_at = Carbon::now();
        }
        $task->save();

        if ($task->room && $task->room->housekeeping_status !== 'maintenance') {
            $task->room->housekeeping_status = 'in_progress';
            $task->room->save();
        }

        HousekeepingTaskHistory::create([
            'housekeeping_task_id' => $task->id,
            'actor_user_id' => $user->id,
            'action' => 'started',
            'from_status' => $fromStatus,
            'to_status' => 'in_progress',
            'notes' => 'Work started by assigned staff.',
            'created_at' => Carbon::now(),
        ]);

        $task->load(['room', 'assignedTo', 'createdBy', 'history.actor:id,name,email,role']);

        return response()->json([
            'message' => 'Housekeeping task started.',
            'task' => $task,
        ]);
    }

    /**
     * Assigned staff records progress notes with optional photo evidence.
     */
    public function progress(Request $request, int $taskId): JsonResponse
    {
        $task = HousekeepingTask::findOrFail($taskId);
        $user = $request->user();

        if ($user->role !== 'admin' && $user->role !== 'manager' && (int) $task->assigned_to_user_id !== (int) $user->id) {
            return response()->json([
                'message' => 'Access denied. You are not authorized to record progress on this task.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'notes' => ['required', 'string', 'max:1000'],
            'evidence' => ['nullable', 'file', 'mimes:jpeg,png,jpg,webp,pdf', 'max:10240'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $evidenceUrl = null;
        if ($request->hasFile('evidence')) {
            $path = $request->file('evidence')->store('housekeeping_evidence', 'public');
            $evidenceUrl = Storage::disk('public')->url($path);
        }

        $notes = $request->input('notes');
        $task->notes = $task->notes ? $task->notes."\n[Progress]: ".$notes : $notes;
        if ($evidenceUrl) {
            $task->evidence_url = $evidenceUrl;
        }
        $task->save();

        HousekeepingTaskHistory::create([
            'housekeeping_task_id' => $task->id,
            'actor_user_id' => $user->id,
            'action' => 'progress_updated',
            'from_status' => $task->status,
            'to_status' => $task->status,
            'notes' => $notes,
            'evidence_url' => $evidenceUrl,
            'created_at' => Carbon::now(),
        ]);

        $task->load(['room', 'assignedTo', 'createdBy', 'history.actor:id,name,email,role']);

        return response()->json([
            'message' => 'Progress recorded successfully.',
            'task' => $task,
        ]);
    }

    /**
     * Assigned staff submits completed cleaning for supervisor inspection & review.
     */
    public function submitReview(Request $request, int $taskId): JsonResponse
    {
        $task = HousekeepingTask::with('room')->findOrFail($taskId);
        $user = $request->user();

        if ($user->role !== 'admin' && $user->role !== 'manager' && (int) $task->assigned_to_user_id !== (int) $user->id) {
            return response()->json([
                'message' => 'Access denied. You are not authorized to submit this task for review.',
            ], 403);
        }

        if ($task->status === 'completed' || $task->status === 'cancelled') {
            return response()->json([
                'message' => "Cannot submit task in '{$task->status}' status for review.",
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'notes' => ['nullable', 'string', 'max:1000'],
            'evidence' => ['nullable', 'file', 'mimes:jpeg,png,jpg,webp,pdf', 'max:10240'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $evidenceUrl = null;
        if ($request->hasFile('evidence')) {
            $path = $request->file('evidence')->store('housekeeping_evidence', 'public');
            $evidenceUrl = Storage::disk('public')->url($path);
            $task->evidence_url = $evidenceUrl;
        }

        $fromStatus = $task->status;
        $task->status = HousekeepingTask::STATUS_PENDING_REVIEW;
        $task->submitted_for_review_at = Carbon::now();

        $notes = $request->input('notes');
        if ($notes) {
            $task->notes = $task->notes ? $task->notes."\n[Completion Notes]: ".$notes : $notes;
        }
        $task->save();

        HousekeepingTaskHistory::create([
            'housekeeping_task_id' => $task->id,
            'actor_user_id' => $user->id,
            'action' => 'submitted_for_review',
            'from_status' => $fromStatus,
            'to_status' => HousekeepingTask::STATUS_PENDING_REVIEW,
            'notes' => $notes ?: 'Submitted for supervisor inspection and review.',
            'evidence_url' => $evidenceUrl,
            'created_at' => Carbon::now(),
        ]);

        $task->load(['room', 'assignedTo', 'createdBy', 'history.actor:id,name,email,role']);

        return response()->json([
            'message' => 'Housekeeping task submitted for supervisor review.',
            'task' => $task,
        ]);
    }

    /**
     * Supervisor (admin/manager) approves or rejects completion review.
     */
    public function review(Request $request, int $taskId): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== 'admin' && $user->role !== 'manager') {
            return response()->json([
                'message' => 'Access denied. Only administrators and supervisors can review housekeeping tasks.',
            ], 403);
        }

        $task = HousekeepingTask::with('room')->findOrFail($taskId);

        $validator = Validator::make($request->all(), [
            'decision' => ['required', 'string', 'in:approve,reject'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $decision = $request->input('decision');
        $notes = $request->input('notes');
        $fromStatus = $task->status;

        if ($decision === 'approve') {
            $task->status = HousekeepingTask::STATUS_COMPLETED;
            $task->completed_at = Carbon::now();

            $room = $task->room;
            if ($room) {
                if (in_array($task->task_type, ['cleaning', 'deep_clean', 'turn_down'])) {
                    $room->housekeeping_status = 'clean';
                    $room->last_cleaned_at = Carbon::now();
                } elseif ($task->task_type === 'inspection') {
                    $room->housekeeping_status = 'inspected';
                    $room->last_inspected_at = Carbon::now();
                } elseif ($task->task_type === 'maintenance') {
                    $room->housekeeping_status = 'clean';
                    $room->housekeeping_notes = 'Maintenance resolved on '.Carbon::now()->toFormattedDateString();
                }
                $room->save();
            }

            $task->save();

            HousekeepingTaskHistory::create([
                'housekeeping_task_id' => $task->id,
                'actor_user_id' => $user->id,
                'action' => 'approved',
                'from_status' => $fromStatus,
                'to_status' => HousekeepingTask::STATUS_COMPLETED,
                'notes' => $notes ?: 'Approved by supervisor.',
                'created_at' => Carbon::now(),
            ]);

            $message = 'Housekeeping task approved and marked as completed.';
        } else {
            $task->status = HousekeepingTask::STATUS_IN_PROGRESS;
            if ($notes) {
                $task->notes = $task->notes ? $task->notes."\n[Supervisor Rework Feedback]: ".$notes : $notes;
            }
            $task->save();

            HousekeepingTaskHistory::create([
                'housekeeping_task_id' => $task->id,
                'actor_user_id' => $user->id,
                'action' => 'rejected',
                'from_status' => $fromStatus,
                'to_status' => HousekeepingTask::STATUS_IN_PROGRESS,
                'notes' => $notes ?: 'Rejected by supervisor; rework required.',
                'created_at' => Carbon::now(),
            ]);

            $message = 'Housekeeping task rejected with feedback. Returned to in-progress.';
        }

        $task->load(['room', 'assignedTo', 'createdBy', 'history.actor:id,name,email,role']);

        return response()->json([
            'message' => $message,
            'task' => $task,
        ]);
    }

    /**
     * Retrieve chronological audit log entries for a task.
     */
    public function history(Request $request, int $taskId): JsonResponse
    {
        $task = HousekeepingTask::findOrFail($taskId);
        $user = $request->user();

        if ($user->role === 'housekeeper' && (int) $task->assigned_to_user_id !== (int) $user->id) {
            return response()->json([
                'message' => 'Access denied. You cannot view history for another staff member\'s task.',
            ], 403);
        }

        $history = HousekeepingTaskHistory::query()
            ->where('housekeeping_task_id', $taskId)
            ->with('actor:id,name,email,role')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'data' => $history,
        ]);
    }

    /**
     * Get staff members available for task assignments.
     */
    public function staff(Request $request): JsonResponse
    {
        $staff = User::query()
            ->whereIn('role', ['admin', 'manager', 'staff', 'housekeeper'])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        return response()->json([
            'staff' => $staff,
        ]);
    }
}
