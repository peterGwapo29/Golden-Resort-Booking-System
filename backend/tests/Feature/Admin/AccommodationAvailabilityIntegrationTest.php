<?php

use App\Models\AccommodationRestriction;
use App\Models\Guest;
use App\Models\MaintenanceRequest;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
    $this->adminToken = $this->admin->createToken('admin-test')->plainTextToken;

    $this->manager = User::factory()->create([
        'role' => 'manager',
        'is_active' => true,
    ]);
    $this->managerToken = $this->manager->createToken('manager-test')->plainTextToken;

    $this->staff = User::factory()->create([
        'role' => 'maintenance',
        'is_active' => true,
    ]);
    $this->staffToken = $this->staff->createToken('staff-test')->plainTextToken;

    $this->villa = Room::create([
        'slug' => 'test-ocean-villa',
        'name' => 'Test Ocean Villa',
        'category' => 'villa',
        'tagline' => 'Luxury Villa',
        'description' => 'Test Ocean Villa description',
        'long_description' => ['Test Ocean Villa'],
        'nightly_rate_php' => 12000.00,
        'total_inventory' => 1,
        'max_guests' => 4,
        'adults_capacity' => 2,
        'children_capacity' => 2,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 85,
        'view' => 'Ocean',
        'amenities' => ['Pool', 'Wi-Fi'],
        'featured_image' => ['src' => 'https://example.com/villa.jpg'],
        'gallery' => [],
        'is_active' => true,
        'housekeeping_status' => 'inspected',
    ]);

    $this->doubleRoom = Room::create([
        'slug' => 'test-deluxe-double',
        'name' => 'Test Deluxe Double',
        'category' => 'room',
        'tagline' => 'Spacious room',
        'description' => 'Deluxe room description',
        'long_description' => ['Deluxe room'],
        'nightly_rate_php' => 5000.00,
        'total_inventory' => 2,
        'max_guests' => 2,
        'adults_capacity' => 2,
        'children_capacity' => 0,
        'bed_configuration' => '1 Queen Bed',
        'size_sqm' => 40,
        'view' => 'Garden',
        'amenities' => ['Wi-Fi'],
        'featured_image' => ['src' => 'https://example.com/room.jpg'],
        'gallery' => [],
        'is_active' => true,
        'housekeeping_status' => 'clean',
    ]);

    $this->guest = Guest::create([
        'full_name' => 'Carlos Mendoza',
        'email' => 'carlos@example.com',
        'phone' => '+639171234567',
    ]);
});

test('active maintenance restriction excludes room from public availability', function () {
    $checkIn = Carbon::tomorrow()->addDays(5)->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(7)->format('Y-m-d');

    // Place maintenance restriction on the villa for these dates
    AccommodationRestriction::create([
        'restriction_number' => 'AR-20261101-TEST',
        'room_id' => $this->villa->id,
        'restriction_type' => 'maintenance_block',
        'title' => 'Villa Plumbing Overhaul',
        'reason' => 'Fixing bathroom water heater and pipe leaks',
        'blocked_units' => 1,
        'start_date' => $checkIn,
        'end_date' => $checkOut,
        'status' => 'active',
        'created_by_user_id' => $this->admin->id,
    ]);

    // Query availability during restricted dates -> Villa must NOT be returned
    $response = $this->getJson("/api/availability?check_in={$checkIn}&check_out={$checkOut}&adults=2");
    $response->assertStatus(200);

    $roomSlugs = collect($response->json('available_rooms'))->pluck('slug');
    expect($roomSlugs)->not->toContain('test-ocean-villa');
    expect($roomSlugs)->toContain('test-deluxe-double');

    // Query availability for dates BEFORE restriction -> Villa must be available
    $freeCheckIn = Carbon::tomorrow()->format('Y-m-d');
    $freeCheckOut = Carbon::tomorrow()->addDays(2)->format('Y-m-d');

    $freeResponse = $this->getJson("/api/availability?check_in={$freeCheckIn}&check_out={$freeCheckOut}&adults=2");
    $freeResponse->assertStatus(200);

    $freeSlugs = collect($freeResponse->json('available_rooms'))->pluck('slug');
    expect($freeSlugs)->toContain('test-ocean-villa');
});

test('multi unit room reflects partial inventory restriction', function () {
    $checkIn = Carbon::tomorrow()->addDays(10)->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(12)->format('Y-m-d');

    // Block 1 of 2 units of Deluxe Double
    AccommodationRestriction::create([
        'restriction_number' => 'AR-20261110-PART',
        'room_id' => $this->doubleRoom->id,
        'restriction_type' => 'emergency_repair',
        'title' => 'AC Compressor replacement in Unit 1',
        'reason' => 'Unit 1 AC non-functional',
        'blocked_units' => 1,
        'start_date' => $checkIn,
        'end_date' => $checkOut,
        'status' => 'active',
        'created_by_user_id' => $this->admin->id,
    ]);

    // Query availability: remaining 1 unit should still be available
    $response = $this->getJson("/api/availability?check_in={$checkIn}&check_out={$checkOut}&adults=2");
    $response->assertStatus(200);

    $doubleRoomData = collect($response->json('available_rooms'))->firstWhere('slug', 'test-deluxe-double');
    expect($doubleRoomData)->not->toBeNull();
    expect($doubleRoomData['available_units'])->toBe(1);

    // Now block the second unit as well
    AccommodationRestriction::create([
        'restriction_number' => 'AR-20261110-FULL',
        'room_id' => $this->doubleRoom->id,
        'restriction_type' => 'scheduled_renovation',
        'title' => 'Deep paint in Unit 2',
        'reason' => 'Annual painting',
        'blocked_units' => 1,
        'start_date' => $checkIn,
        'end_date' => $checkOut,
        'status' => 'active',
        'created_by_user_id' => $this->admin->id,
    ]);

    // Query availability again: 0 units available -> room should be excluded
    $fullResponse = $this->getJson("/api/availability?check_in={$checkIn}&check_out={$checkOut}&adults=2");
    $fullResponse->assertStatus(200);

    $doubleRoomFull = collect($fullResponse->json('available_rooms'))->firstWhere('slug', 'test-deluxe-double');
    expect($doubleRoomFull)->toBeNull();
});

test('reservation creation aborts 409 when blocked by active restriction', function () {
    $checkIn = Carbon::tomorrow()->addDays(3)->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(6)->format('Y-m-d');

    AccommodationRestriction::create([
        'restriction_number' => 'AR-20261103-BLOCK',
        'room_id' => $this->villa->id,
        'restriction_type' => 'safety_hazard',
        'title' => 'Electrical inspection',
        'reason' => 'Rewiring electrical main breaker',
        'blocked_units' => 1,
        'start_date' => $checkIn,
        'end_date' => $checkOut,
        'status' => 'active',
        'created_by_user_id' => $this->admin->id,
    ]);

    $payload = [
        'room_slug' => 'test-ocean-villa',
        'check_in' => $checkIn,
        'check_out' => $checkOut,
        'adults' => 2,
        'children' => 0,
        'guest_full_name' => 'Juan Dela Cruz',
        'guest_email' => 'juan@example.com',
        'guest_phone' => '+639181234567',
    ];

    $response = $this->postJson('/api/reservations', $payload);
    $response->assertStatus(409)
        ->assertJsonPath('message', 'The selected accommodation is no longer available for the requested dates.');

    expect(Reservation::where('guest_email_snapshot', 'juan@example.com')->count())->toBe(0);
});

test('reservation creation succeeds on half open boundary dates', function () {
    // Restriction from Nov 10 to Nov 15
    AccommodationRestriction::create([
        'restriction_number' => 'AR-20261110-BOUND',
        'room_id' => $this->villa->id,
        'restriction_type' => 'maintenance_block',
        'title' => 'Window glazing',
        'reason' => 'Glazing repair',
        'blocked_units' => 1,
        'start_date' => '2026-11-10',
        'end_date' => '2026-11-15',
        'status' => 'active',
        'created_by_user_id' => $this->admin->id,
    ]);

    // Booking 1: Checking out on 2026-11-10 (stay ends when restriction starts) -> Should succeed
    $payloadBefore = [
        'room_slug' => 'test-ocean-villa',
        'check_in' => '2026-11-08',
        'check_out' => '2026-11-10',
        'adults' => 2,
        'children' => 0,
        'guest_full_name' => 'Guest Early',
        'guest_email' => 'early@example.com',
        'guest_phone' => '+639181112233',
    ];

    $res1 = $this->postJson('/api/reservations', $payloadBefore);
    $res1->assertStatus(201);

    // Booking 2: Checking in on 2026-11-15 (stay begins when restriction ends) -> Should succeed
    $payloadAfter = [
        'room_slug' => 'test-ocean-villa',
        'check_in' => '2026-11-15',
        'check_out' => '2026-11-17',
        'adults' => 2,
        'children' => 0,
        'guest_full_name' => 'Guest Late',
        'guest_email' => 'late@example.com',
        'guest_phone' => '+639184445566',
    ];

    $res2 = $this->postJson('/api/reservations', $payloadAfter);
    $res2->assertStatus(201);
});

test('placing restriction detects overlapping existing reservations', function () {
    // Existing reservation for the villa
    $res = Reservation::create([
        'booking_reference' => 'GR-20261201-CONF',
        'room_id' => $this->villa->id,
        'guest_id' => $this->guest->id,
        'check_in' => '2026-12-01',
        'check_out' => '2026-12-04',
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 3,
        'nightly_rate_php' => 12000.00,
        'total_price_php' => 36000.00,
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'Carlos Mendoza',
        'guest_email_snapshot' => 'carlos@example.com',
        'guest_phone_snapshot' => '+639171234567',
    ]);

    // Check conflicts endpoint
    $conflictCheck = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
        ->postJson('/api/admin/restrictions/check-conflicts', [
            'room_id' => $this->villa->id,
            'start_date' => '2026-12-02',
            'end_date' => '2026-12-06',
            'blocked_units' => 1,
        ]);

    $conflictCheck->assertStatus(200)
        ->assertJsonPath('conflicts_detected', true)
        ->assertJsonPath('overlapping_count', 1)
        ->assertJsonPath('overlapping_reservations.0.booking_reference', 'GR-20261201-CONF');

    // Create the restriction with relocation protocol
    $createResponse = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
        ->postJson('/api/admin/restrictions', [
            'room_id' => $this->villa->id,
            'restriction_type' => 'emergency_repair',
            'title' => 'Roof Leak Emergency',
            'reason' => 'Ceiling water intrusion requires patching',
            'blocked_units' => 1,
            'start_date' => '2026-12-02',
            'end_date' => '2026-12-06',
            'handling_protocol' => 'relocate_guest_approved',
        ]);

    $createResponse->assertStatus(201);
    $createdId = $createResponse->json('data.id');

    $restriction = AccommodationRestriction::find($createdId);
    expect($restriction)->not->toBeNull();
    expect($restriction->handling_protocol)->toBe('relocate_guest_approved');
    expect($restriction->affected_reservations_snapshot)->toBeArray();
    expect($restriction->affected_reservations_snapshot[0]['booking_reference'])->toBe('GR-20261201-CONF');

    // Existing reservation must remain intact and uncancelled
    $res->refresh();
    expect($res->status)->toBe('confirmed');
});

test('operational staff cannot create or clear restrictions', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->staffToken}")
        ->postJson('/api/admin/restrictions', [
            'room_id' => $this->villa->id,
            'restriction_type' => 'maintenance_block',
            'title' => 'Unauthorized attempt',
            'reason' => 'Technician trying to block room directly',
            'start_date' => '2026-12-10',
            'end_date' => '2026-12-12',
        ]);

    $response->assertStatus(403);

    // Create restriction as admin
    $restriction = AccommodationRestriction::create([
        'restriction_number' => 'AR-20261210-AUTH',
        'room_id' => $this->villa->id,
        'restriction_type' => 'maintenance_block',
        'title' => 'Admin restriction',
        'reason' => 'Standard block',
        'blocked_units' => 1,
        'start_date' => '2026-12-10',
        'end_date' => '2026-12-12',
        'status' => 'active',
        'created_by_user_id' => $this->admin->id,
    ]);

    // Staff tries to clear restriction -> 403 Forbidden
    $clearResponse = $this->withHeader('Authorization', "Bearer {$this->staffToken}")
        ->postJson("/api/admin/restrictions/{$restriction->id}/clear", [
            'clearance_notes' => 'Attempting to self-clear',
        ]);

    $clearResponse->assertStatus(403);
});

test('authorized manager can clear restriction and restore availability', function () {
    $restriction = AccommodationRestriction::create([
        'restriction_number' => 'AR-20261215-CLR',
        'room_id' => $this->villa->id,
        'restriction_type' => 'maintenance_block',
        'title' => 'Deep sanitized',
        'reason' => 'Sanitization underway',
        'blocked_units' => 1,
        'start_date' => '2026-12-15',
        'end_date' => '2026-12-18',
        'status' => 'active',
        'created_by_user_id' => $this->admin->id,
    ]);

    // Room is currently unavailable
    $resBefore = $this->getJson('/api/availability?check_in=2026-12-15&check_out=2026-12-17&adults=2');
    $slugsBefore = collect($resBefore->json('available_rooms'))->pluck('slug');
    expect($slugsBefore)->not->toContain('test-ocean-villa');

    // Manager issues clearance
    $clearResponse = $this->withHeader('Authorization', "Bearer {$this->managerToken}")
        ->postJson("/api/admin/restrictions/{$restriction->id}/clear", [
            'clearance_notes' => 'Inspection completed by Facilities Manager. Water and power fully verified.',
            'room_condition' => 'inspected',
        ]);

    $clearResponse->assertStatus(200)
        ->assertJsonPath('data.status', 'cleared')
        ->assertJsonPath('data.cleared_by_user_id', $this->manager->id);

    // Availability is restored immediately
    $resAfter = $this->getJson('/api/availability?check_in=2026-12-15&check_out=2026-12-17&adults=2');
    $slugsAfter = collect($resAfter->json('available_rooms'))->pluck('slug');
    expect($slugsAfter)->toContain('test-ocean-villa');

    $this->villa->refresh();
    expect($this->villa->housekeeping_status)->toBe('inspected');
});

test('marking maintenance request resolved does not automatically clear restriction', function () {
    $maintenance = MaintenanceRequest::create([
        'tracking_number' => 'MR-20261220-ABCD',
        'title' => 'Balcony railing reinforcement',
        'description' => 'Replace rusted screws on second floor ocean villa balcony',
        'resource_type' => 'villa',
        'room_id' => $this->villa->id,
        'resource_name' => 'Test Ocean Villa',
        'priority' => 'urgent',
        'status' => 'pending_review',
        'reported_by_user_id' => $this->admin->id,
        'assigned_to_user_id' => $this->staff->id,
    ]);

    $restriction = AccommodationRestriction::create([
        'restriction_number' => 'AR-20261220-BALC',
        'room_id' => $this->villa->id,
        'maintenance_request_id' => $maintenance->id,
        'restriction_type' => 'safety_hazard',
        'title' => 'Balcony Railing Hazard',
        'reason' => 'Balcony closed until reinforcement certified',
        'blocked_units' => 1,
        'start_date' => '2026-12-20',
        'end_date' => '2026-12-25',
        'status' => 'active',
        'created_by_user_id' => $this->admin->id,
    ]);

    // Admin reviews and approves the maintenance request
    $reviewResponse = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
        ->postJson("/api/admin/maintenance/{$maintenance->id}/review", [
            'action' => 'approve',
            'notes' => 'Technician completed repairs.',
        ]);

    $reviewResponse->assertStatus(200);
    $maintenance->refresh();
    expect($maintenance->status)->toBe('resolved');

    // Critical rule check: Restriction status MUST REMAIN ACTIVE until explicit operational clearance!
    $restriction->refresh();
    expect($restriction->status)->toBe('active');
    expect($restriction->cleared_at)->toBeNull();

    // Villa remains unavailable for booking during restriction dates
    $res = $this->getJson('/api/availability?check_in=2026-12-21&check_out=2026-12-24&adults=2');
    $slugs = collect($res->json('available_rooms'))->pluck('slug');
    expect($slugs)->not->toContain('test-ocean-villa');
});

test('calendar schedule marks restricted days as maintenance_blocked', function () {
    AccommodationRestriction::create([
        'restriction_number' => 'AR-20261015-CAL',
        'room_id' => $this->villa->id,
        'restriction_type' => 'maintenance_block',
        'title' => 'Villa deep scrub',
        'reason' => 'Annual sanitization',
        'blocked_units' => 1,
        'start_date' => '2026-10-15',
        'end_date' => '2026-10-18',
        'status' => 'active',
        'created_by_user_id' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
        ->getJson('/api/admin/calendar/schedule?start_date=2026-10-14&end_date=2026-10-19&room_id='.$this->villa->id);

    $response->assertStatus(200);

    $villaData = collect($response->json('accommodations'))->firstWhere('id', $this->villa->id);
    expect($villaData)->not->toBeNull();

    $scheduleMap = collect($villaData['schedule'])->keyBy('date');

    // Oct 14: before restriction -> available
    expect($scheduleMap['2026-10-14']['status'])->toBe('available');

    // Oct 15, 16, 17: restricted -> maintenance_blocked
    expect($scheduleMap['2026-10-15']['status'])->toBe('maintenance_blocked');
    expect($scheduleMap['2026-10-15']['restricted_units'])->toBe(1);
    expect($scheduleMap['2026-10-15']['available_units'])->toBe(0);

    // Oct 18: restriction ended -> available
    expect($scheduleMap['2026-10-18']['status'])->toBe('available');
});

test('admin can cancel restriction with reason', function () {
    $restriction = AccommodationRestriction::create([
        'restriction_number' => 'AR-20261020-CANC',
        'room_id' => $this->villa->id,
        'restriction_type' => 'operational_hold',
        'title' => 'Scheduled inspection hold',
        'reason' => 'Planned audit',
        'blocked_units' => 1,
        'start_date' => '2026-10-20',
        'end_date' => '2026-10-22',
        'status' => 'active',
        'created_by_user_id' => $this->admin->id,
    ]);

    $cancelResponse = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
        ->postJson("/api/admin/restrictions/{$restriction->id}/cancel", [
            'cancellation_reason' => 'Audit postponed to next quarter.',
        ]);

    $cancelResponse->assertStatus(200)
        ->assertJsonPath('data.status', 'cancelled')
        ->assertJsonPath('data.cancellation_reason', 'Audit postponed to next quarter.');

    $restriction->refresh();
    expect($restriction->status)->toBe('cancelled');
});
