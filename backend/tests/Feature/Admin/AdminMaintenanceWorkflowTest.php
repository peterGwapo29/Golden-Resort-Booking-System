<?php

use App\Models\MaintenanceRequest;
use App\Models\MaintenanceRequestHistory;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');

    $this->admin = User::create([
        'name' => 'General Manager',
        'email' => 'admin@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'admin',
    ]);
    $this->adminToken = $this->admin->createToken('admin-token')->plainTextToken;

    $this->tech1 = User::create([
        'name' => 'Mario Electrician',
        'email' => 'mario@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'maintenance',
        'department' => 'Engineering',
    ]);
    $this->tech1Token = $this->tech1->createToken('tech1-token')->plainTextToken;

    $this->tech2 = User::create([
        'name' => 'Luigi Plumber',
        'email' => 'luigi@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'maintenance',
        'department' => 'Engineering',
    ]);
    $this->tech2Token = $this->tech2->createToken('tech2-token')->plainTextToken;

    $this->housekeeper = User::create([
        'name' => 'Elena Housekeeper',
        'email' => 'elena@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'housekeeper',
    ]);
    $this->housekeeperToken = $this->housekeeper->createToken('housekeeper-token')->plainTextToken;

    $this->room = Room::create([
        'slug' => 'ocean-villa-101',
        'name' => 'Ocean Villa 101',
        'category' => 'villa',
        'tagline' => 'Luxury Villa',
        'description' => 'Ocean view villa',
        'long_description' => ['Description'],
        'nightly_rate_php' => 12000.00,
        'total_inventory' => 1,
        'max_guests' => 4,
        'adults_capacity' => 4,
        'children_capacity' => 2,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 85,
        'view' => 'Ocean',
        'amenities' => ['Pool', 'Wi-Fi'],
        'featured_image' => ['src' => '/images/villa.jpg', 'alt' => 'Ocean Villa', 'source' => '/images/villa.jpg'],
        'gallery' => [],
        'is_active' => true,
        'housekeeping_status' => 'clean',
    ]);
});

test('admin can retrieve eligible staff assignees', function () {
    $response = $this->withToken($this->adminToken)
        ->getJson('/api/admin/maintenance/assignees')
        ->assertStatus(200);

    $names = collect($response->json('data'))->pluck('name')->all();
    expect($names)->toContain('Mario Electrician', 'Luigi Plumber', 'Elena Housekeeper');
});

test('admin can assign maintenance request to staff with due date and notes', function () {
    $req = MaintenanceRequest::create([
        'title' => 'Circuit Breaker Tripping',
        'description' => 'Kitchen stove causes main breaker to trip',
        'resource_type' => 'villa',
        'room_id' => $this->room->id,
        'resource_name' => $this->room->name,
        'priority' => 'urgent',
        'status' => 'reported',
    ]);

    $dueDate = now()->addHours(6)->toDateTimeString();

    $response = $this->withToken($this->adminToken)
        ->postJson("/api/admin/maintenance/{$req->id}/assign", [
            'assigned_to_user_id' => $this->tech1->id,
            'due_date' => $dueDate,
            'notes' => 'Please inspect wiring and replace faulty breaker switch.',
        ])
        ->assertStatus(200);

    $data = $response->json('data');
    expect($data['assigned_to']['id'])->toBe($this->tech1->id);
    expect($data['status'])->toBe('assigned');
    expect($data['assigned_at'])->not()->toBeNull();

    $this->assertDatabaseHas('maintenance_requests', [
        'id' => $req->id,
        'assigned_to_user_id' => $this->tech1->id,
        'status' => 'assigned',
    ]);

    $this->assertDatabaseHas('maintenance_request_histories', [
        'maintenance_request_id' => $req->id,
        'action' => 'assigned',
        'to_assigned_to_user_id' => $this->tech1->id,
    ]);
});

test('admin can reassign request and previous assignee is captured in history', function () {
    $req = MaintenanceRequest::create([
        'title' => 'Pipe Burst Under Sink',
        'description' => 'Water spraying under vanity',
        'resource_type' => 'room',
        'resource_name' => 'Ocean Villa 101',
        'priority' => 'urgent',
        'status' => 'assigned',
        'assigned_to_user_id' => $this->tech1->id,
        'assigned_at' => now()->subHour(),
    ]);

    $response = $this->withToken($this->adminToken)
        ->postJson("/api/admin/maintenance/{$req->id}/assign", [
            'assigned_to_user_id' => $this->tech2->id,
            'notes' => 'Mario is on another emergency; reassigning to Luigi.',
        ])
        ->assertStatus(200);

    $this->assertDatabaseHas('maintenance_requests', [
        'id' => $req->id,
        'assigned_to_user_id' => $this->tech2->id,
    ]);

    $this->assertDatabaseHas('maintenance_request_histories', [
        'maintenance_request_id' => $req->id,
        'action' => 'reassigned',
        'from_assigned_to_user_id' => $this->tech1->id,
        'to_assigned_to_user_id' => $this->tech2->id,
    ]);
});

test('assigned staff can acknowledge task and status becomes acknowledged', function () {
    $req = MaintenanceRequest::create([
        'title' => 'HVAC Filter Cleaning',
        'description' => 'Quarterly filter clean',
        'resource_type' => 'room',
        'resource_name' => 'Room 101',
        'priority' => 'normal',
        'status' => 'assigned',
        'assigned_to_user_id' => $this->tech1->id,
        'assigned_at' => now(),
    ]);

    $response = $this->withToken($this->tech1Token)
        ->postJson("/api/admin/maintenance/{$req->id}/acknowledge", [
            'notes' => 'Received. On my way.',
        ])
        ->assertStatus(200);

    expect($response->json('data.status'))->toBe('acknowledged');
    expect($response->json('data.acknowledged_at'))->not()->toBeNull();

    $this->assertDatabaseHas('maintenance_requests', [
        'id' => $req->id,
        'status' => 'acknowledged',
    ]);
});

test('unauthorized staff cannot acknowledge a task assigned to someone else', function () {
    $req = MaintenanceRequest::create([
        'title' => 'Roof Leak',
        'description' => 'Water dripping',
        'resource_type' => 'facility',
        'resource_name' => 'Clubhouse',
        'priority' => 'high',
        'status' => 'assigned',
        'assigned_to_user_id' => $this->tech1->id,
    ]);

    // Tech2 tries to acknowledge Tech1's task
    $this->withToken($this->tech2Token)
        ->postJson("/api/admin/maintenance/{$req->id}/acknowledge", [])
        ->assertStatus(403);
});

test('assigned staff can start work and record progress with evidence files', function () {
    $req = MaintenanceRequest::create([
        'title' => 'Leaking Faucet',
        'description' => 'Cold water faucet leaking',
        'resource_type' => 'room',
        'resource_name' => 'Room 101',
        'priority' => 'normal',
        'status' => 'acknowledged',
        'assigned_to_user_id' => $this->tech1->id,
    ]);

    // Start work
    $this->withToken($this->tech1Token)
        ->postJson("/api/admin/maintenance/{$req->id}/start")
        ->assertStatus(200)
        ->assertJsonPath('data.status', 'in_progress');

    // Progress update with evidence file
    $file = UploadedFile::fake()->create('progress_photo.jpg', 300, 'image/jpeg');

    $progressRes = $this->withToken($this->tech1Token)
        ->postJson("/api/admin/maintenance/{$req->id}/progress", [
            'notes' => 'Disassembled faucet cartridge; replacing rubber gasket.',
            'cost_php' => 250.00,
            'attachments' => [$file],
        ])
        ->assertStatus(200);

    expect($progressRes->json('data.status'))->toBe('in_progress');
    expect($progressRes->json('data.cost_php'))->toEqual(250.0);
    expect(count($progressRes->json('data.attachments')))->toBe(1);

    $this->assertDatabaseHas('maintenance_request_histories', [
        'maintenance_request_id' => $req->id,
        'action' => 'progress_updated',
    ]);
});

test('assigned staff can submit work for completion review', function () {
    $req = MaintenanceRequest::create([
        'title' => 'Broken Sliding Door Lock',
        'description' => 'Patio sliding door lock jammed',
        'resource_type' => 'room',
        'resource_name' => 'Ocean Villa 101',
        'priority' => 'high',
        'status' => 'in_progress',
        'assigned_to_user_id' => $this->tech1->id,
    ]);

    $proofFile = UploadedFile::fake()->create('finished_lock.jpg', 250, 'image/jpeg');

    $response = $this->withToken($this->tech1Token)
        ->postJson("/api/admin/maintenance/{$req->id}/submit-review", [
            'completion_notes' => 'Installed new mortise lock mechanism and tested 5 times. Smooth sliding restored.',
            'cost_php' => 1250.00,
            'attachments' => [$proofFile],
        ])
        ->assertStatus(200);

    $data = $response->json('data');
    expect($data['status'])->toBe('pending_review');
    expect($data['submitted_for_review_at'])->not()->toBeNull();

    $this->assertDatabaseHas('maintenance_requests', [
        'id' => $req->id,
        'status' => 'pending_review',
    ]);
});

test('non-admin staff cannot approve completion review', function () {
    $req = MaintenanceRequest::create([
        'title' => 'Broken AC',
        'description' => 'Compressor noise',
        'resource_type' => 'room',
        'resource_name' => 'Room 101',
        'priority' => 'high',
        'status' => 'pending_review',
        'assigned_to_user_id' => $this->tech1->id,
    ]);

    // Tech 1 cannot approve their own review
    $this->withToken($this->tech1Token)
        ->postJson("/api/admin/maintenance/{$req->id}/review", ['action' => 'approve'])
        ->assertStatus(403);
});

test('admin can approve review to resolve request or reject with feedback', function () {
    $req = MaintenanceRequest::create([
        'title' => 'Infinity Pool Skimmer Clogged',
        'description' => 'Leaves clogging skimmer basket',
        'resource_type' => 'facility',
        'resource_name' => 'Infinity Pool',
        'priority' => 'normal',
        'status' => 'pending_review',
        'assigned_to_user_id' => $this->tech1->id,
        'cost_php' => 400.00,
    ]);

    // Rejection first
    $rejectRes = $this->withToken($this->adminToken)
        ->postJson("/api/admin/maintenance/{$req->id}/review", [
            'action' => 'reject',
            'notes' => 'Water clarity still cloudy; please run backwash cycle.',
        ])
        ->assertStatus(200);

    expect($rejectRes->json('data.status'))->toBe('in_progress');

    // Technician resubmits
    $this->withToken($this->tech1Token)
        ->postJson("/api/admin/maintenance/{$req->id}/submit-review", [
            'completion_notes' => 'Backwash cycle completed, chemical levels balanced.',
        ])
        ->assertStatus(200);

    // Admin approves
    $approveRes = $this->withToken($this->adminToken)
        ->postJson("/api/admin/maintenance/{$req->id}/review", [
            'action' => 'approve',
            'notes' => 'Inspected pool water; looks crystal clear. Approved.',
        ])
        ->assertStatus(200);

    expect($approveRes->json('data.status'))->toBe('resolved');
    expect($approveRes->json('data.resolved_at'))->not()->toBeNull();

    $this->assertDatabaseHas('maintenance_requests', [
        'id' => $req->id,
        'status' => 'resolved',
    ]);
});

test('staff dashboard includes assigned maintenance requests and updates metrics', function () {
    MaintenanceRequest::create([
        'title' => 'Fix Balcony Railing',
        'description' => 'Loose screw on railing',
        'resource_type' => 'room',
        'resource_name' => 'Villa 101',
        'priority' => 'urgent',
        'status' => 'assigned',
        'assigned_to_user_id' => $this->tech1->id,
    ]);

    $response = $this->withToken($this->tech1Token)
        ->getJson('/api/staff/dashboard')
        ->assertStatus(200);

    $tasks = $response->json('assigned_tasks');
    expect(count($tasks))->toBeGreaterThanOrEqual(1);

    $task = collect($tasks)->firstWhere('title', 'Fix Balcony Railing');
    expect($task)->not()->toBeNull();
    expect($task['source'])->toBe('maintenance');
    expect($task['priority'])->toBe('urgent');
    expect($response->json('metrics.my_open_tasks'))->toBeGreaterThanOrEqual(1);

    // Permitted modules should include maintenance
    $modules = collect($response->json('permitted_modules'))->pluck('key')->all();
    expect($modules)->toContain('maintenance');
});

test('history endpoint returns complete chronological audit logs', function () {
    $req = MaintenanceRequest::create([
        'title' => 'Generator Checkup',
        'description' => 'Scheduled inspection',
        'resource_type' => 'equipment',
        'resource_name' => 'Main Generator',
        'priority' => 'normal',
        'status' => 'reported',
    ]);

    $this->withToken($this->adminToken)
        ->postJson("/api/admin/maintenance/{$req->id}/assign", [
            'assigned_to_user_id' => $this->tech1->id,
            'notes' => 'Check oil and spark plugs',
        ]);

    $this->withToken($this->tech1Token)
        ->postJson("/api/admin/maintenance/{$req->id}/acknowledge");

    $response = $this->withToken($this->adminToken)
        ->getJson("/api/admin/maintenance/{$req->id}/history")
        ->assertStatus(200);

    $history = $response->json('data');
    expect(count($history))->toBeGreaterThanOrEqual(2);
    $actions = collect($history)->pluck('action')->all();
    expect($actions)->toContain('assigned', 'acknowledged');
});
