<?php

use App\Models\HousekeepingTask;
use App\Models\HousekeepingTaskHistory;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');

    $this->admin = User::create([
        'name' => 'Admin Manager',
        'email' => 'admin@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'admin',
        'is_active' => true,
    ]);
    $this->adminToken = $this->admin->createToken('admin-token')->plainTextToken;

    $this->manager = User::create([
        'name' => 'Operations Manager',
        'email' => 'manager@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'manager',
        'is_active' => true,
    ]);
    $this->managerToken = $this->manager->createToken('manager-token')->plainTextToken;

    $this->housekeeper1 = User::create([
        'name' => 'Maria Santos',
        'email' => 'maria@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'housekeeper',
        'is_active' => true,
    ]);
    $this->hk1Token = $this->housekeeper1->createToken('hk1-token')->plainTextToken;

    $this->housekeeper2 = User::create([
        'name' => 'Ana Reyes',
        'email' => 'ana@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'housekeeper',
        'is_active' => true,
    ]);
    $this->hk2Token = $this->housekeeper2->createToken('hk2-token')->plainTextToken;

    $this->room = Room::create([
        'slug' => 'deluxe-sea-view-'.uniqid(),
        'name' => 'Deluxe Sea View 201',
        'category' => 'room',
        'tagline' => 'Ocean view room',
        'description' => 'Beautiful sea view room',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 5000.00,
        'total_inventory' => 1,
        'max_guests' => 2,
        'adults_capacity' => 2,
        'children_capacity' => 1,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 42,
        'view' => 'Sea',
        'amenities' => ['Wi-Fi', 'Balcony'],
        'featured_image' => ['src' => '/images/deluxe.jpg', 'alt' => 'Deluxe Sea View', 'source' => '/images/deluxe.jpg'],
        'gallery' => [],
        'is_active' => true,
        'housekeeping_status' => 'dirty',
    ]);
});

test('housekeeper cannot create or assign tasks (403 forbidden)', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->hk1Token}")
        ->postJson('/api/admin/housekeeping/tasks', [
            'room_id' => $this->room->id,
            'assigned_to_user_id' => $this->housekeeper1->id,
            'task_type' => 'cleaning',
            'priority' => 'normal',
        ]);

    $response->assertStatus(403)
        ->assertJsonPath('message', 'Access denied. Only administrators and supervisors can assign housekeeping tasks.');
});

test('housekeeper cannot directly modify room operational status (403 forbidden)', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->hk1Token}")
        ->patchJson("/api/admin/housekeeping/rooms/{$this->room->id}/status", [
            'status' => 'clean',
        ]);

    $response->assertStatus(403)
        ->assertJsonPath('message', 'Access denied. Only administrators and supervisors can directly alter room operational status.');
});

test('admin can assign housekeeping task and audit history is recorded', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
        ->postJson('/api/admin/housekeeping/tasks', [
            'room_id' => $this->room->id,
            'assigned_to_user_id' => $this->housekeeper1->id,
            'task_type' => 'deep_clean',
            'priority' => 'high',
            'notes' => 'Sanitize balcony and change linens',
            'scheduled_date' => Carbon::today()->toDateString(),
        ]);

    $response->assertStatus(201);
    $taskId = $response->json('task.id');

    expect(HousekeepingTaskHistory::where('housekeeping_task_id', $taskId)->count())->toBe(1);
    $history = HousekeepingTaskHistory::where('housekeeping_task_id', $taskId)->first();
    expect($history->action)->toBe('assigned');
    expect($history->actor_user_id)->toBe($this->admin->id);
    expect($history->to_status)->toBe('pending');
});

test('non-assigned housekeeper cannot start or submit colleague task (403 forbidden)', function () {
    $task = HousekeepingTask::create([
        'room_id' => $this->room->id,
        'assigned_to_user_id' => $this->housekeeper1->id,
        'created_by_user_id' => $this->admin->id,
        'task_type' => 'cleaning',
        'priority' => 'normal',
        'status' => 'pending',
    ]);

    // Housekeeper 2 tries to start Housekeeper 1's task
    $response = $this->withHeader('Authorization', "Bearer {$this->hk2Token}")
        ->postJson("/api/admin/housekeeping/tasks/{$task->id}/start");

    $response->assertStatus(403)
        ->assertJsonPath('message', 'Access denied. You are not authorized to start this housekeeping task.');

    // Housekeeper 2 tries to submit Housekeeper 1's task
    $submitRes = $this->withHeader('Authorization', "Bearer {$this->hk2Token}")
        ->postJson("/api/admin/housekeeping/tasks/{$task->id}/submit-review", [
            'notes' => 'Done',
        ]);

    $submitRes->assertStatus(403)
        ->assertJsonPath('message', 'Access denied. You are not authorized to submit this task for review.');
});

test('assigned housekeeper can start work and room transitions to in_progress', function () {
    $task = HousekeepingTask::create([
        'room_id' => $this->room->id,
        'assigned_to_user_id' => $this->housekeeper1->id,
        'created_by_user_id' => $this->admin->id,
        'task_type' => 'cleaning',
        'priority' => 'normal',
        'status' => 'pending',
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->hk1Token}")
        ->postJson("/api/admin/housekeeping/tasks/{$task->id}/start");

    $response->assertStatus(200)
        ->assertJsonPath('task.status', 'in_progress');

    $freshTask = $task->fresh();
    expect($freshTask->status)->toBe('in_progress');
    expect($freshTask->started_at)->not->toBeNull();
    expect($this->room->fresh()->housekeeping_status)->toBe('in_progress');

    expect(HousekeepingTaskHistory::where('housekeeping_task_id', $task->id)->where('action', 'started')->count())->toBe(1);
});

test('assigned housekeeper can log progress notes with photo evidence', function () {
    $task = HousekeepingTask::create([
        'room_id' => $this->room->id,
        'assigned_to_user_id' => $this->housekeeper1->id,
        'created_by_user_id' => $this->admin->id,
        'task_type' => 'deep_clean',
        'priority' => 'normal',
        'status' => 'in_progress',
        'started_at' => Carbon::now(),
    ]);

    $evidenceFile = UploadedFile::fake()->create('progress.jpg', 150, 'image/jpeg');

    $response = $this->withHeader('Authorization', "Bearer {$this->hk1Token}")
        ->postJson("/api/admin/housekeeping/tasks/{$task->id}/progress", [
            'notes' => 'Bathroom scrubbed and disinfected.',
            'evidence' => $evidenceFile,
        ]);

    $response->assertStatus(200);
    $freshTask = $task->fresh();
    expect($freshTask->evidence_url)->not->toBeNull();

    $history = HousekeepingTaskHistory::where('housekeeping_task_id', $task->id)->where('action', 'progress_updated')->first();
    expect($history)->not->toBeNull();
    expect($history->notes)->toBe('Bathroom scrubbed and disinfected.');
    expect($history->evidence_url)->not->toBeNull();
});

test('assigned housekeeper submits task for supervisor review', function () {
    $task = HousekeepingTask::create([
        'room_id' => $this->room->id,
        'assigned_to_user_id' => $this->housekeeper1->id,
        'created_by_user_id' => $this->admin->id,
        'task_type' => 'cleaning',
        'priority' => 'normal',
        'status' => 'in_progress',
        'started_at' => Carbon::now(),
    ]);

    $evidenceFile = UploadedFile::fake()->create('completion_proof.jpg', 200, 'image/jpeg');

    $response = $this->withHeader('Authorization', "Bearer {$this->hk1Token}")
        ->postJson("/api/admin/housekeeping/tasks/{$task->id}/submit-review", [
            'notes' => 'Room cleaned, fresh towels provided, all surfaces sanitized.',
            'evidence' => $evidenceFile,
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('task.status', 'pending_review');

    $freshTask = $task->fresh();
    expect($freshTask->status)->toBe('pending_review');
    expect($freshTask->submitted_for_review_at)->not->toBeNull();
    expect($freshTask->evidence_url)->not->toBeNull();
});

test('housekeeper cannot approve own review (403 forbidden)', function () {
    $task = HousekeepingTask::create([
        'room_id' => $this->room->id,
        'assigned_to_user_id' => $this->housekeeper1->id,
        'created_by_user_id' => $this->admin->id,
        'task_type' => 'cleaning',
        'priority' => 'normal',
        'status' => 'pending_review',
        'submitted_for_review_at' => Carbon::now(),
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->hk1Token}")
        ->postJson("/api/admin/housekeeping/tasks/{$task->id}/review", [
            'decision' => 'approve',
        ]);

    $response->assertStatus(403)
        ->assertJsonPath('message', 'Access denied. Only administrators and supervisors can review housekeeping tasks.');
});

test('supervisor approves review and room becomes clean', function () {
    $task = HousekeepingTask::create([
        'room_id' => $this->room->id,
        'assigned_to_user_id' => $this->housekeeper1->id,
        'created_by_user_id' => $this->admin->id,
        'task_type' => 'cleaning',
        'priority' => 'normal',
        'status' => 'pending_review',
        'submitted_for_review_at' => Carbon::now(),
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->managerToken}")
        ->postJson("/api/admin/housekeeping/tasks/{$task->id}/review", [
            'decision' => 'approve',
            'notes' => 'Room inspected and certified clean.',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('task.status', 'completed');

    $freshTask = $task->fresh();
    expect($freshTask->status)->toBe('completed');
    expect($freshTask->completed_at)->not->toBeNull();
    expect($this->room->fresh()->housekeeping_status)->toBe('clean');

    $history = HousekeepingTaskHistory::where('housekeeping_task_id', $task->id)->where('action', 'approved')->first();
    expect($history)->not->toBeNull();
    expect($history->actor_user_id)->toBe($this->manager->id);
});

test('supervisor rejects review with feedback and task returns to in_progress', function () {
    $task = HousekeepingTask::create([
        'room_id' => $this->room->id,
        'assigned_to_user_id' => $this->housekeeper1->id,
        'created_by_user_id' => $this->admin->id,
        'task_type' => 'cleaning',
        'priority' => 'normal',
        'status' => 'pending_review',
        'submitted_for_review_at' => Carbon::now(),
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->managerToken}")
        ->postJson("/api/admin/housekeeping/tasks/{$task->id}/review", [
            'decision' => 'reject',
            'notes' => 'Mirrors need additional wipe down.',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('task.status', 'in_progress');

    $freshTask = $task->fresh();
    expect($freshTask->status)->toBe('in_progress');

    $history = HousekeepingTaskHistory::where('housekeeping_task_id', $task->id)->where('action', 'rejected')->first();
    expect($history)->not->toBeNull();
    expect($history->notes)->toBe('Mirrors need additional wipe down.');
});
