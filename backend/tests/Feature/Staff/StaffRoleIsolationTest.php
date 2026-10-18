<?php

use App\Models\HousekeepingTask;
use App\Models\MaintenanceRequest;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->housekeeper = User::create([
        'name' => 'Maria Santos',
        'email' => 'maria.hk@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'housekeeper',
        'is_active' => true,
    ]);
    $this->hkToken = $this->housekeeper->createToken('hk-token')->plainTextToken;

    $this->technician = User::create([
        'name' => 'Carlos Tech',
        'email' => 'carlos.tech@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'maintenance',
        'is_active' => true,
    ]);
    $this->techToken = $this->technician->createToken('tech-token')->plainTextToken;

    $this->frontDesk = User::create([
        'name' => 'Ana Front',
        'email' => 'ana.fd@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'front_desk',
        'is_active' => true,
    ]);
    $this->fdToken = $this->frontDesk->createToken('fd-token')->plainTextToken;

    $this->room = Room::create([
        'slug' => 'room-isolation-'.uniqid(),
        'name' => 'Suite 301',
        'category' => 'suite',
        'tagline' => 'Suite',
        'description' => 'Test suite',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 6000.00,
        'total_inventory' => 1,
        'max_guests' => 2,
        'adults_capacity' => 2,
        'children_capacity' => 1,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 45,
        'view' => 'Garden',
        'amenities' => ['Wi-Fi'],
        'featured_image' => ['src' => '/images/deluxe.jpg', 'alt' => 'Suite', 'source' => '/images/deluxe.jpg'],
        'gallery' => [],
        'is_active' => true,
        'housekeeping_status' => 'dirty',
    ]);
});

test('housekeeper dashboard returns only housekeeping tasks and no maintenance work orders', function () {
    // Create housekeeping task for Maria
    HousekeepingTask::create([
        'room_id' => $this->room->id,
        'assigned_to_user_id' => $this->housekeeper->id,
        'created_by_user_id' => $this->housekeeper->id,
        'task_type' => 'cleaning',
        'priority' => 'high',
        'status' => 'pending',
    ]);

    // Create maintenance request also assigned to Maria (edge case)
    MaintenanceRequest::create([
        'title' => 'Fix AC in Villa 1',
        'description' => 'AC blowing warm air',
        'resource_type' => 'room',
        'resource_name' => 'Villa 1',
        'priority' => 'urgent',
        'status' => 'assigned',
        'assigned_to_user_id' => $this->housekeeper->id,
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->hkToken}")
        ->getJson('/api/staff/dashboard');

    $response->assertStatus(200);

    // Verify all returned tasks are housekeeping
    $tasks = collect($response->json('assigned_tasks'));
    expect($tasks)->toHaveCount(1);
    expect($tasks->first()['source'])->toBe('housekeeping');

    // Verify permitted modules do not include maintenance or front desk checkin
    $moduleKeys = collect($response->json('permitted_modules'))->pluck('key');
    expect($moduleKeys)->toContain('housekeeping');
    expect($moduleKeys)->not->toContain('maintenance');
    expect($moduleKeys)->not->toContain('checkin');
});

test('maintenance staff dashboard returns only maintenance requests and no housekeeping tasks', function () {
    // Create housekeeping task assigned to Carlos
    HousekeepingTask::create([
        'room_id' => $this->room->id,
        'assigned_to_user_id' => $this->technician->id,
        'created_by_user_id' => $this->technician->id,
        'task_type' => 'cleaning',
        'priority' => 'normal',
        'status' => 'pending',
    ]);

    // Create maintenance request assigned to Carlos
    MaintenanceRequest::create([
        'title' => 'Water pressure check',
        'description' => 'Low water pressure',
        'resource_type' => 'room',
        'resource_name' => 'Room 301',
        'priority' => 'high',
        'status' => 'assigned',
        'assigned_to_user_id' => $this->technician->id,
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->techToken}")
        ->getJson('/api/staff/dashboard');

    $response->assertStatus(200);

    $tasks = collect($response->json('assigned_tasks'));
    expect($tasks)->toHaveCount(1);
    expect($tasks->first()['source'])->toBe('maintenance');

    $moduleKeys = collect($response->json('permitted_modules'))->pluck('key');
    expect($moduleKeys)->toContain('maintenance');
    expect($moduleKeys)->not->toContain('housekeeping');
    expect($moduleKeys)->not->toContain('checkin');
});

test('housekeeper cannot access maintenance api endpoints (403 forbidden)', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->hkToken}")
        ->getJson('/api/admin/maintenance');

    $response->assertStatus(403);
});

test('maintenance staff cannot access front desk check-in endpoints (403 forbidden)', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->techToken}")
        ->getJson('/api/admin/check-in-out/overview');

    $response->assertStatus(403);
});

test('front desk staff cannot access maintenance api endpoints (403 forbidden)', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->fdToken}")
        ->getJson('/api/admin/maintenance');

    $response->assertStatus(403);
});
