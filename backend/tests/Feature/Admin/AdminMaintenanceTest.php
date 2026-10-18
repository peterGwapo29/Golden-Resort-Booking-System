<?php

use App\Models\MaintenanceRequest;
use App\Models\MaintenanceRequestAttachment;
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
        'name' => 'Admin Manager',
        'email' => 'admin@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'admin',
    ]);
    $this->adminToken = $this->admin->createToken('admin-token')->plainTextToken;

    $this->maintenanceStaff = User::create([
        'name' => 'Bob Builder',
        'email' => 'bob@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'maintenance',
    ]);
    $this->maintenanceToken = $this->maintenanceStaff->createToken('maintenance-token')->plainTextToken;

    $this->guestUser = User::create([
        'name' => 'Inactive User',
        'email' => 'inactive@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'staff',
        'is_active' => false,
    ]);
    $this->inactiveToken = $this->guestUser->createToken('inactive-token')->plainTextToken;

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

test('unauthenticated users cannot access maintenance endpoints', function () {
    $this->getJson('/api/admin/maintenance')->assertStatus(401);
    $this->getJson('/api/admin/maintenance/stats')->assertStatus(401);
    $this->postJson('/api/admin/maintenance', [])->assertStatus(401);
});

test('inactive users are rejected from maintenance endpoints', function () {
    $this->withToken($this->inactiveToken)
        ->getJson('/api/admin/maintenance')
        ->assertStatus(403);
});

test('admin can retrieve maintenance statistics', function () {
    MaintenanceRequest::create([
        'title' => 'Leaking pipe',
        'description' => 'Bathroom pipe leaking under sink',
        'resource_type' => 'room',
        'room_id' => $this->room->id,
        'resource_name' => $this->room->name,
        'priority' => 'urgent',
        'status' => 'reported',
        'cost_php' => 1500.00,
    ]);

    MaintenanceRequest::create([
        'title' => 'AC maintenance',
        'description' => 'Scheduled AC cleaning',
        'resource_type' => 'room',
        'room_id' => $this->room->id,
        'resource_name' => $this->room->name,
        'priority' => 'normal',
        'status' => 'in_progress',
        'cost_php' => 2000.00,
    ]);

    MaintenanceRequest::create([
        'title' => 'Pool filter replaced',
        'description' => 'Replaced pump cartridge',
        'resource_type' => 'facility',
        'resource_name' => 'Main Pool',
        'priority' => 'high',
        'status' => 'resolved',
        'cost_php' => 4500.00,
        'resolved_at' => now(),
    ]);

    $response = $this->withToken($this->adminToken)
        ->getJson('/api/admin/maintenance/stats')
        ->assertStatus(200);

    $response->assertJson([
        'total_active' => 2,
        'urgent_high' => 1,
        'in_progress' => 1,
        'resolved' => 1,
        'total_cost_php' => 8000.00,
    ]);
});

test('admin and maintenance staff can list and filter maintenance requests', function () {
    MaintenanceRequest::create([
        'title' => 'Broken Lamp',
        'description' => 'Bedside lamp not powering on',
        'resource_type' => 'room',
        'resource_name' => 'Deluxe Garden Room',
        'priority' => 'low',
        'status' => 'reported',
    ]);

    MaintenanceRequest::create([
        'title' => 'Generator Oil Change',
        'description' => 'Quarterly oil and filter overhaul',
        'resource_type' => 'equipment',
        'resource_name' => 'Backup Generator 1',
        'priority' => 'high',
        'status' => 'in_progress',
    ]);

    // List all
    $response = $this->withToken($this->adminToken)
        ->getJson('/api/admin/maintenance')
        ->assertStatus(200);

    expect(count($response->json('data')))->toBe(2);

    // Filter by priority
    $priorityFilter = $this->withToken($this->maintenanceToken)
        ->getJson('/api/admin/maintenance?priority=high')
        ->assertStatus(200);

    expect(count($priorityFilter->json('data')))->toBe(1);
    expect($priorityFilter->json('data.0.title'))->toBe('Generator Oil Change');

    // Filter by resource_type
    $resourceFilter = $this->withToken($this->adminToken)
        ->getJson('/api/admin/maintenance?resource_type=room')
        ->assertStatus(200);

    expect(count($resourceFilter->json('data')))->toBe(1);
    expect($resourceFilter->json('data.0.title'))->toBe('Broken Lamp');

    // Search by title or keyword
    $searchRes = $this->withToken($this->adminToken)
        ->getJson('/api/admin/maintenance?search=Generator')
        ->assertStatus(200);

    expect(count($searchRes->json('data')))->toBe(1);
    expect($searchRes->json('data.0.resource_name'))->toBe('Backup Generator 1');
});

test('admin can create a maintenance request with file attachments', function () {
    $file1 = UploadedFile::fake()->create('damage.jpg', 200, 'image/jpeg');
    $file2 = UploadedFile::fake()->create('quote.pdf', 500, 'application/pdf');

    $payload = [
        'title' => 'Villa Roof Shingle Replacement',
        'description' => 'Strong wind displaced 3 tiles on north side',
        'resource_type' => 'villa',
        'resource_name' => 'Ocean Front Villa 1',
        'location' => 'North Roof Gable',
        'priority' => 'high',
        'status' => 'reported',
        'cost_php' => 8500.50,
        'repair_notes' => 'Contractor scheduled for tomorrow morning',
        'attachments' => [$file1, $file2],
    ];

    $response = $this->withToken($this->adminToken)
        ->postJson('/api/admin/maintenance', $payload)
        ->assertStatus(201);

    $data = $response->json('data');
    expect($data['title'])->toBe('Villa Roof Shingle Replacement');
    expect($data['tracking_number'])->toStartWith('MNT-');
    expect($data['cost_php'])->toBe(8500.5);
    expect(count($data['attachments']))->toBe(2);

    $requestId = $data['id'];
    $this->assertDatabaseHas('maintenance_requests', [
        'id' => $requestId,
        'title' => 'Villa Roof Shingle Replacement',
        'resource_type' => 'villa',
    ]);

    $this->assertDatabaseCount('maintenance_request_attachments', 2);
});

test('validation rejects invalid priority, status, or negative cost', function () {
    $response = $this->withToken($this->adminToken)
        ->postJson('/api/admin/maintenance', [
            'title' => 'Invalid Request',
            'description' => 'Test invalid payload',
            'resource_type' => 'invalid_resource',
            'resource_name' => 'None',
            'priority' => 'extreme_super_urgent',
            'status' => 'done_forever',
            'cost_php' => -50.00,
        ])
        ->assertStatus(422);

    $response->assertJsonValidationErrors(['resource_type', 'priority', 'status', 'cost_php']);
});

test('admin can update maintenance request and marking resolved automatically sets resolved_at', function () {
    $req = MaintenanceRequest::create([
        'title' => 'Faulty Water Heater',
        'description' => 'No hot water in bathroom',
        'resource_type' => 'room',
        'room_id' => $this->room->id,
        'resource_name' => $this->room->name,
        'priority' => 'high',
        'status' => 'in_progress',
        'cost_php' => 1200.00,
    ]);

    expect($req->resolved_at)->toBeNull();

    $response = $this->withToken($this->adminToken)
        ->putJson("/api/admin/maintenance/{$req->id}", [
            'title' => 'Faulty Water Heater (Thermostat Replaced)',
            'status' => 'resolved',
            'cost_php' => 1850.00,
            'repair_notes' => 'Replaced 1500W heating element and reset breaker.',
        ])
        ->assertStatus(200);

    $data = $response->json('data');
    expect($data['status'])->toBe('resolved');
    expect($data['resolved_at'])->not()->toBeNull();
    expect($data['cost_php'])->toEqual(1850.0);
    expect($data['repair_notes'])->toBe('Replaced 1500W heating element and reset breaker.');

    $this->assertDatabaseHas('maintenance_requests', [
        'id' => $req->id,
        'status' => 'resolved',
    ]);
});

test('admin can update request status via dedicated status endpoint', function () {
    $req = MaintenanceRequest::create([
        'title' => 'Spa Jacuzzi Jet Clogged',
        'description' => 'Jet 3 has low pressure',
        'resource_type' => 'facility',
        'resource_name' => 'Wellness Spa',
        'priority' => 'normal',
        'status' => 'reported',
    ]);

    $response = $this->withToken($this->adminToken)
        ->patchJson("/api/admin/maintenance/{$req->id}/status", [
            'status' => 'in_progress',
            'repair_notes' => 'Technician inspecting pipe blockage',
            'cost_php' => 300.00,
        ])
        ->assertStatus(200);

    expect($response->json('data.status'))->toBe('in_progress');
    expect($response->json('data.cost_php'))->toEqual(300.0);
});

test('admin can delete a maintenance request and its physical attachments', function () {
    $req = MaintenanceRequest::create([
        'title' => 'Test Deletion',
        'description' => 'Test deletion description',
        'resource_type' => 'equipment',
        'resource_name' => 'Test Pump',
    ]);

    $filePath = "maintenance/{$req->id}/test.jpg";
    Storage::disk('public')->put($filePath, 'fake content');

    $attachment = MaintenanceRequestAttachment::create([
        'maintenance_request_id' => $req->id,
        'file_path' => $filePath,
        'file_name' => 'test.jpg',
        'file_type' => 'image/jpeg',
        'file_size' => 1024,
    ]);

    expect(Storage::disk('public')->exists($filePath))->toBeTrue();

    $this->withToken($this->adminToken)
        ->deleteJson("/api/admin/maintenance/{$req->id}")
        ->assertStatus(200);

    $this->assertDatabaseMissing('maintenance_requests', ['id' => $req->id]);
    $this->assertDatabaseMissing('maintenance_request_attachments', ['id' => $attachment->id]);
    expect(Storage::disk('public')->exists($filePath))->toBeFalse();
});

test('admin can delete a single attachment', function () {
    $req = MaintenanceRequest::create([
        'title' => 'Attachment Removal Test',
        'description' => 'Test single attachment deletion',
        'resource_type' => 'room',
        'resource_name' => 'Deluxe Room',
    ]);

    $filePath = "maintenance/{$req->id}/single.jpg";
    Storage::disk('public')->put($filePath, 'fake image content');

    $attachment = MaintenanceRequestAttachment::create([
        'maintenance_request_id' => $req->id,
        'file_path' => $filePath,
        'file_name' => 'single.jpg',
        'file_type' => 'image/jpeg',
        'file_size' => 2048,
    ]);

    $this->withToken($this->adminToken)
        ->deleteJson("/api/admin/maintenance/{$req->id}/attachments/{$attachment->id}")
        ->assertStatus(200);

    $this->assertDatabaseMissing('maintenance_request_attachments', ['id' => $attachment->id]);
    expect(Storage::disk('public')->exists($filePath))->toBeFalse();
});
