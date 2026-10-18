<?php

namespace App\Http\Controllers\Api\Staff;

use App\Http\Controllers\Controller;
use App\Models\HousekeepingTask;
use App\Models\MaintenanceRequest;
use App\Models\Reservation;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffDashboardController extends Controller
{
    /**
     * Display role-tailored dashboard data, metrics, and assigned tasks for the authenticated staff member.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = Carbon::today()->toDateString();
        $permissions = $user->getAllPermissions();

        // 1. Assigned open housekeeping tasks for this staff member (only for housekeeper, manager, admin, or general staff)
        if ($user->role === 'maintenance' || $user->role === 'front_desk') {
            $assignedHousekeeping = collect();
        } else {
            $assignedHousekeeping = HousekeepingTask::query()
                ->with(['room:id,name,slug,category,housekeeping_status'])
                ->where('assigned_to_user_id', $user->id)
                ->whereIn('status', ['pending', 'in_progress', 'pending_review'])
                ->get()
                ->map(function ($task) {
                    return [
                        'id' => $task->id,
                        'source' => 'housekeeping',
                        'task_type' => $task->task_type,
                        'title' => ucfirst(str_replace('_', ' ', $task->task_type)).' Task',
                        'priority' => $task->priority,
                        'status' => $task->status,
                        'notes' => $task->notes,
                        'evidence_url' => $task->evidence_url,
                        'submitted_for_review_at' => $task->submitted_for_review_at?->toISOString(),
                        'scheduled_date' => $task->scheduled_date ? Carbon::parse($task->scheduled_date)->toDateString() : null,
                        'started_at' => $task->started_at?->toISOString(),
                        'room' => $task->room ? [
                            'id' => $task->room->id,
                            'name' => $task->room->name,
                            'slug' => $task->room->slug,
                            'category' => $task->room->category,
                            'housekeeping_status' => $task->room->housekeeping_status,
                        ] : null,
                    ];
                });
        }

        // 2. Assigned open maintenance requests for this staff member (only for maintenance, manager, admin, or general staff)
        if ($user->role === 'housekeeper' || $user->role === 'front_desk') {
            $assignedMaintenance = collect();
        } else {
            $assignedMaintenance = MaintenanceRequest::query()
                ->with(['room:id,name,slug,category,housekeeping_status'])
                ->where('assigned_to_user_id', $user->id)
                ->whereNotIn('status', ['resolved', 'cancelled'])
                ->get()
                ->map(function ($mnt) {
                    return [
                        'id' => $mnt->id,
                        'source' => 'maintenance',
                        'tracking_number' => $mnt->tracking_number,
                        'title' => $mnt->title,
                        'task_type' => 'maintenance',
                        'resource_name' => $mnt->resource_name,
                        'resource_type' => $mnt->resource_type,
                        'priority' => $mnt->priority,
                        'status' => $mnt->status,
                        'notes' => $mnt->repair_notes ?: $mnt->description,
                        'scheduled_date' => $mnt->due_date ? Carbon::parse($mnt->due_date)->toDateString() : ($mnt->assigned_at ? Carbon::parse($mnt->assigned_at)->toDateString() : null),
                        'started_at' => $mnt->started_at?->toISOString(),
                        'is_overdue' => (bool) $mnt->is_overdue,
                        'room' => $mnt->room ? [
                            'id' => $mnt->room->id,
                            'name' => $mnt->room->name,
                            'slug' => $mnt->room->slug,
                            'category' => $mnt->room->category,
                            'housekeeping_status' => $mnt->room->housekeeping_status,
                        ] : null,
                    ];
                });
        }

        // Combine and prioritize urgent > high > normal > low
        $priorityWeight = ['urgent' => 1, 'high' => 2, 'normal' => 3, 'low' => 4];
        $assignedTasks = $assignedHousekeeping->concat($assignedMaintenance)->sort(function ($a, $b) use ($priorityWeight) {
            $wA = $priorityWeight[$a['priority']] ?? 5;
            $wB = $priorityWeight[$b['priority']] ?? 5;
            if ($wA === $wB) {
                return $b['id'] <=> $a['id'];
            }
            return $wA <=> $wB;
        })->values();

        // 3. Count of tasks completed today by this staff member (housekeeping + maintenance)
        $completedHousekeepingToday = ($user->role === 'maintenance' || $user->role === 'front_desk')
            ? 0
            : HousekeepingTask::query()
                ->where('assigned_to_user_id', $user->id)
                ->where('status', 'completed')
                ->whereDate('completed_at', $today)
                ->count();

        $completedMaintenanceToday = ($user->role === 'housekeeper' || $user->role === 'front_desk')
            ? 0
            : MaintenanceRequest::query()
                ->where('assigned_to_user_id', $user->id)
                ->where('status', 'resolved')
                ->whereDate('resolved_at', $today)
                ->count();

        $completedTodayCount = $completedHousekeepingToday + $completedMaintenanceToday;

        // 4. Dynamic operational metrics based on granted permissions
        $metrics = [
            'my_open_tasks' => $assignedTasks->count(),
            'my_completed_today' => $completedTodayCount,
            'my_open_maintenance' => $assignedMaintenance->count(),
            'my_open_housekeeping' => $assignedHousekeeping->count(),
        ];

        // Housekeeping / Maintenance metrics
        if ($user->hasPermission('housekeeping.manage')) {
            $allRooms = Room::all(['id', 'housekeeping_status', 'is_active']);
            $metrics['clean_rooms'] = $allRooms->where('housekeeping_status', 'clean')->count();
            $metrics['dirty_rooms'] = $allRooms->where('housekeeping_status', 'dirty')->count();
            $metrics['in_progress_rooms'] = $allRooms->where('housekeeping_status', 'in_progress')->count();
            $metrics['inspected_rooms'] = $allRooms->where('housekeeping_status', 'inspected')->count();
            $metrics['maintenance_rooms'] = $allRooms->where('housekeeping_status', 'maintenance')->count();
            $metrics['total_resort_open_tasks'] = HousekeepingTask::whereIn('status', ['pending', 'in_progress', 'pending_review'])->count();
        }

        // Front desk / Check-in metrics
        if ($user->hasPermission('checkin.manage') || $user->hasPermission('reservations.view')) {
            $metrics['today_arrivals'] = Reservation::whereDate('check_in', $today)
                ->where('status', '!=', 'cancelled')
                ->count();
            $metrics['today_departures'] = Reservation::whereDate('check_out', $today)
                ->where('status', '!=', 'cancelled')
                ->count();
            $metrics['in_house_guests'] = Reservation::where('status', 'checked_in')->count();
        }

        // Accommodation metrics
        if ($user->hasPermission('rooms.view')) {
            $metrics['total_accommodations'] = Room::count();
            $metrics['active_accommodations'] = Room::where('is_active', true)->count();
        }

        // 5. Allowed operational modules whitelist (strictly role-tailored)
        $permittedModules = [];
        if (in_array($user->role, ['admin', 'manager', 'maintenance'], true) && $user->hasPermission('maintenance.view')) {
            $permittedModules[] = [
                'key' => 'maintenance',
                'name' => 'Maintenance Requests & Work Orders',
                'description' => 'Track, acknowledge, and resolve assigned repairs, asset upkeep, and equipment jobs.',
                'href' => '/staff/maintenance',
            ];
        }
        if (in_array($user->role, ['admin', 'manager', 'housekeeper'], true) && $user->hasPermission('housekeeping.manage')) {
            $permittedModules[] = [
                'key' => 'housekeeping',
                'name' => 'Housekeeping & Rooms',
                'description' => 'Manage cleaning tasks, room turn-downs, and cleanliness status.',
                'href' => '/staff/housekeeping',
            ];
        }
        if (in_array($user->role, ['admin', 'manager', 'front_desk'], true) && $user->hasPermission('checkin.manage')) {
            $permittedModules[] = [
                'key' => 'checkin',
                'name' => 'Front Desk Arrivals & Departures',
                'description' => 'Process guest check-ins, key issuance, and checkout settlements.',
                'href' => '/staff/check-in-out',
            ];
        }
        if ($user->hasPermission('rooms.view')) {
            $permittedModules[] = [
                'key' => 'calendar',
                'name' => 'Room Availability Calendar',
                'description' => 'View live room schedule, bookings, and inventory distribution.',
                'href' => '/staff/calendar',
            ];
            if (in_array($user->role, ['admin', 'manager', 'front_desk'], true)) {
                $permittedModules[] = [
                    'key' => 'rooms',
                    'name' => 'Accommodations Catalog',
                    'description' => 'Browse room tiers, capacities, and amenities.',
                    'href' => '/staff/rooms',
                ];
            }
        }
        if (in_array($user->role, ['admin', 'manager', 'front_desk'], true) && $user->hasPermission('reservations.view')) {
            $permittedModules[] = [
                'key' => 'reservations',
                'name' => 'Reservations Bookings',
                'description' => 'Inspect guest reservations, booking dates, and details.',
                'href' => '/staff/reservations',
            ];
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'department' => $user->department,
                'phone' => $user->phone,
                'last_login_at' => $user->last_login_at?->toISOString(),
                'permissions' => $permissions,
            ],
            'metrics' => $metrics,
            'assigned_tasks' => $assignedTasks,
            'permitted_modules' => $permittedModules,
        ]);
    }
}
