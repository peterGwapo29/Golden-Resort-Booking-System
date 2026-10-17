<?php

use App\Models\HousekeepingTask;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::create([
        'name' => 'Admin Manager',
        'email' => 'admin@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'admin',
    ]);
    $this->token = $this->admin->createToken('admin-token')->plainTextToken;

    $this->staff = User::create([
        'name' => 'Elena Santos',
        'email' => 'elena.housekeeper@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'staff',
    ]);

    $this->room = Room::create([
        'slug' => 'deluxe-garden-room',
        'name' => 'Deluxe Garden Room',
        'category' => 'room',
        'tagline' => 'Tranquil garden sanctuary',
        'description' => 'A beautiful garden room',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 4500.00,
        'total_inventory' => 1,
        'max_guests' => 2,
        'adults_capacity' => 2,
        'children_capacity' => 1,
        'bed_configuration' => '1 Queen Bed',
        'size_sqm' => 38,
        'view' => 'Garden',
        'amenities' => ['Wi-Fi', 'Balcony'],
        'featured_image' => ['src' => '/images/deluxe.jpg', 'alt' => 'Deluxe Garden Room', 'source' => '/images/deluxe.jpg'],
        'gallery' => [],
        'is_active' => true,
        'housekeeping_status' => 'clean',
    ]);
});

test('unauthenticated users cannot access housekeeping endpoints', function () {
    $this->getJson('/api/admin/housekeeping/rooms')->assertStatus(401);
    $this->getJson('/api/admin/housekeeping/tasks')->assertStatus(401);
    $this->postJson('/api/admin/housekeeping/tasks', [])->assertStatus(401);
});

test('non-admin users without proper role are forbidden from housekeeping', function () {
    $guestUser = User::create([
        'name' => 'Guest User',
        'email' => 'guest@example.com',
        'password' => Hash::make('password123'),
        'role' => 'customer',
    ]);
    $guestToken = $guestUser->createToken('guest-token')->plainTextToken;

    $this->withHeader('Authorization', "Bearer {$guestToken}")
        ->getJson('/api/admin/housekeeping/rooms')
        ->assertStatus(403);
});

test('admin can retrieve housekeeping room condition overview and operational metrics', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->getJson('/api/admin/housekeeping/rooms');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'metrics' => [
                'total_accommodations',
                'clean',
                'dirty',
                'in_progress',
                'inspected',
                'maintenance',
                'active_tasks_count',
            ],
            'rooms' => [
                '*' => [
                    'id',
                    'name',
                    'slug',
                    'category',
                    'housekeeping_status',
                    'is_ready_for_guest',
                    'is_under_maintenance',
                ],
            ],
        ]);

    expect($response->json('metrics.total_accommodations'))->toBe(1);
    expect($response->json('metrics.clean'))->toBe(1);
});

test('updating room condition records timestamps and marks guest readiness', function () {
    // 1. Mark room as dirty (e.g. guest checked out)
    $dirtyResponse = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->patchJson("/api/admin/housekeeping/rooms/{$this->room->id}/status", [
            'status' => 'dirty',
            'notes' => 'Checkout turnover needed',
        ]);

    $dirtyResponse->assertStatus(200);
    expect($this->room->fresh()->housekeeping_status)->toBe('dirty');
    expect($this->room->fresh()->is_ready_for_guest)->toBeFalse();

    // 2. Mark room as clean after cleaning
    $cleanResponse = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->patchJson("/api/admin/housekeeping/rooms/{$this->room->id}/status", [
            'status' => 'clean',
        ]);

    $cleanResponse->assertStatus(200);
    $freshRoom = $this->room->fresh();
    expect($freshRoom->housekeeping_status)->toBe('clean');
    expect($freshRoom->last_cleaned_at)->not->toBeNull();

    // 3. Supervisor inspects room -> becomes inspected (guest ready!)
    $inspectResponse = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->patchJson("/api/admin/housekeeping/rooms/{$this->room->id}/status", [
            'status' => 'inspected',
            'notes' => 'Inspected and certified clean for arrival',
        ]);

    $inspectResponse->assertStatus(200);
    $inspectedRoom = $this->room->fresh();
    expect($inspectedRoom->housekeeping_status)->toBe('inspected');
    expect($inspectedRoom->last_inspected_at)->not->toBeNull();
    expect($inspectResponse->json('room.is_ready_for_guest'))->toBeTrue();
});

test('placing room under maintenance blocks it from active availability', function () {
    // Initially active and available
    expect(Room::active()->where('id', $this->room->id)->count())->toBe(1);

    // Set to maintenance
    $response = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->patchJson("/api/admin/housekeeping/rooms/{$this->room->id}/status", [
            'status' => 'maintenance',
            'notes' => 'Air conditioning compressor replacement',
        ]);

    $response->assertStatus(200);
    expect($response->json('room.is_under_maintenance'))->toBeTrue();

    // Verify room is excluded from Room::active()
    expect(Room::active()->where('id', $this->room->id)->count())->toBe(0);

    // Verify public availability API does not return room under maintenance
    $checkIn = Carbon::tomorrow()->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(2)->format('Y-m-d');

    $availResponse = $this->getJson("/api/availability?check_in={$checkIn}&check_out={$checkOut}&adults=2");
    $availResponse->assertStatus(200);
    expect(collect($availResponse->json('available_rooms'))->pluck('id')->contains($this->room->id))->toBeFalse();
});

test('admin can assign cleaning and maintenance tasks to staff', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->postJson('/api/admin/housekeeping/tasks', [
            'room_id' => $this->room->id,
            'assigned_to_user_id' => $this->staff->id,
            'task_type' => 'deep_clean',
            'priority' => 'high',
            'notes' => 'Sanitize balcony and change all linens',
            'scheduled_date' => Carbon::today()->toDateString(),
        ]);

    $response->assertStatus(201)
        ->assertJsonStructure([
            'message',
            'task' => [
                'id',
                'room_id',
                'assigned_to_user_id',
                'task_type',
                'priority',
                'status',
                'notes',
            ],
        ]);

    $task = HousekeepingTask::find($response->json('task.id'));
    expect($task)->not->toBeNull();
    expect($task->task_type)->toBe('deep_clean');
    expect($task->priority)->toBe('high');
    expect($task->status)->toBe('pending');
    expect($task->assigned_to_user_id)->toBe($this->staff->id);
    expect($task->created_by_user_id)->toBe($this->admin->id);
});

test('creating a maintenance task automatically transitions room to maintenance block', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->postJson('/api/admin/housekeeping/tasks', [
            'room_id' => $this->room->id,
            'assigned_to_user_id' => $this->staff->id,
            'task_type' => 'maintenance',
            'priority' => 'urgent',
            'notes' => 'Plumbing leak under sink',
            'scheduled_date' => Carbon::today()->toDateString(),
        ]);

    $response->assertStatus(201);
    expect($this->room->fresh()->housekeeping_status)->toBe('maintenance');
    expect(Room::active()->where('id', $this->room->id)->count())->toBe(0);
});

test('task status lifecycle updates timestamps and sets room condition upon completion', function () {
    $task = HousekeepingTask::create([
        'room_id' => $this->room->id,
        'assigned_to_user_id' => $this->staff->id,
        'created_by_user_id' => $this->admin->id,
        'task_type' => 'inspection',
        'priority' => 'normal',
        'status' => 'pending',
        'notes' => 'Pre-arrival inspection for VIP',
        'scheduled_date' => Carbon::today()->toDateString(),
    ]);

    // 1. Start task -> in_progress
    $progressResponse = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->patchJson("/api/admin/housekeeping/tasks/{$task->id}/status", [
            'status' => 'in_progress',
        ]);

    $progressResponse->assertStatus(200);
    $inProgTask = $task->fresh();
    expect($inProgTask->status)->toBe('in_progress');
    expect($inProgTask->started_at)->not->toBeNull();

    // 2. Complete inspection task -> room becomes inspected (ready for guest!)
    $completeResponse = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->patchJson("/api/admin/housekeeping/tasks/{$task->id}/status", [
            'status' => 'completed',
            'notes' => 'Passed 25-point resort quality inspection',
        ]);

    $completeResponse->assertStatus(200);
    $doneTask = $task->fresh();
    expect($doneTask->status)->toBe('completed');
    expect($doneTask->completed_at)->not->toBeNull();

    $freshRoom = $this->room->fresh();
    expect($freshRoom->housekeeping_status)->toBe('inspected');
    expect($freshRoom->last_inspected_at)->not->toBeNull();
});

test('invalid room and task status transitions are rejected with 422', function () {
    $invalidRoomRes = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->patchJson("/api/admin/housekeeping/rooms/{$this->room->id}/status", [
            'status' => 'invalid_condition_code',
        ]);

    $invalidRoomRes->assertStatus(422)
        ->assertJsonValidationErrors(['status']);

    $task = HousekeepingTask::create([
        'room_id' => $this->room->id,
        'created_by_user_id' => $this->admin->id,
        'task_type' => 'cleaning',
        'priority' => 'normal',
        'status' => 'pending',
    ]);

    $invalidTaskRes = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->patchJson("/api/admin/housekeeping/tasks/{$task->id}/status", [
            'status' => 'not_a_valid_task_status',
        ]);

    $invalidTaskRes->assertStatus(422)
        ->assertJsonValidationErrors(['status']);
});
