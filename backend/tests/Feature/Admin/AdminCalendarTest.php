<?php

use App\Models\Guest;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;
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

    $this->room1 = Room::create([
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
    ]);

    $this->room2 = Room::create([
        'slug' => 'family-suite',
        'name' => 'Family Suite',
        'category' => 'suite',
        'tagline' => 'Spacious suite for families',
        'description' => 'A large family suite',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 8500.00,
        'total_inventory' => 2,
        'max_guests' => 5,
        'adults_capacity' => 4,
        'children_capacity' => 2,
        'bed_configuration' => '2 Queen Beds',
        'size_sqm' => 65,
        'view' => 'Pool',
        'amenities' => ['Wi-Fi', 'Kitchenette'],
        'featured_image' => ['src' => '/images/suite.jpg', 'alt' => 'Family Suite', 'source' => '/images/suite.jpg'],
        'gallery' => [],
        'is_active' => true,
    ]);

    $this->guest = Guest::create([
        'full_name' => 'Maria Santos',
        'email' => 'maria@example.com',
        'phone' => '+639181112233',
    ]);
});

test('unauthenticated users cannot access admin calendar schedule', function () {
    $response = $this->getJson('/api/admin/calendar/schedule');
    $response->assertStatus(401);
});

test('non-admin users cannot access admin calendar schedule', function () {
    $regularUser = User::create([
        'name' => 'Customer User',
        'email' => 'customer@example.com',
        'password' => Hash::make('password123'),
        'role' => 'customer',
    ]);
    $customerToken = $regularUser->createToken('cust-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$customerToken}")
        ->getJson('/api/admin/calendar/schedule');

    $response->assertStatus(403);
});

test('calendar schedule rejects date range exceeding 62 days', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->getJson('/api/admin/calendar/schedule?start_date=2026-01-01&end_date=2026-03-15');

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['range']);
});

test('calendar schedule rejects end_date earlier than start_date', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->getJson('/api/admin/calendar/schedule?start_date=2026-05-10&end_date=2026-05-01');

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['end_date']);
});

test('calendar schedule accurately computes room availability and half-open check-out availability', function () {
    // Create reservation for Deluxe Room (total_inventory = 1) from 2026-10-10 to 2026-10-13 (3 nights)
    $res = Reservation::create([
        'booking_reference' => 'GR-20261010-TEST',
        'room_id' => $this->room1->id,
        'guest_id' => $this->guest->id,
        'check_in' => '2026-10-10',
        'check_out' => '2026-10-13',
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 3,
        'nightly_rate_php' => 4500.00,
        'total_price_php' => 13500.00,
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'Maria Santos',
        'guest_email_snapshot' => 'maria@example.com',
        'guest_phone_snapshot' => '+639181112233',
    ]);

    // Record partial payment
    Payment::create([
        'payment_reference' => 'PAY-20261010-001',
        'reservation_id' => $res->id,
        'amount' => 5000.00,
        'currency' => 'PHP',
        'payment_method' => 'bank_transfer',
        'status' => 'completed',
        'recorded_by_user_id' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->getJson('/api/admin/calendar/schedule?start_date=2026-10-09&end_date=2026-10-14');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'range' => ['start_date', 'end_date', 'days_count'],
            'accommodations',
            'reservations',
            'daily_summaries',
            'metrics',
        ]);

    $data = $response->json();
    $room1Data = collect($data['accommodations'])->firstWhere('id', $this->room1->id);
    expect($room1Data)->not->toBeNull();

    $scheduleMap = collect($room1Data['schedule'])->keyBy('date');

    // Oct 09: before stay -> available (1 unit available)
    expect($scheduleMap['2026-10-09']['available_units'])->toBe(1);
    expect($scheduleMap['2026-10-09']['status'])->toBe('available');

    // Oct 10: check-in night -> fully booked (0 units available)
    expect($scheduleMap['2026-10-10']['available_units'])->toBe(0);
    expect($scheduleMap['2026-10-10']['booked_units'])->toBe(1);
    expect($scheduleMap['2026-10-10']['status'])->toBe('fully_booked');

    // Oct 11: middle night -> fully booked
    expect($scheduleMap['2026-10-11']['available_units'])->toBe(0);

    // Oct 12: last night -> fully booked
    expect($scheduleMap['2026-10-12']['available_units'])->toBe(0);

    // Oct 13: check-out day -> available! (half-open hotel rule: guest checks out)
    expect($scheduleMap['2026-10-13']['available_units'])->toBe(1);
    expect($scheduleMap['2026-10-13']['status'])->toBe('available');

    // Check reservation bar data
    $resBar = collect($data['reservations'])->firstWhere('booking_reference', 'GR-20261010-TEST');
    expect($resBar)->not->toBeNull();
    expect($resBar['payment_status'])->toBe('partially_paid');
    expect((float) $resBar['net_paid_php'])->toEqual(5000.0);
    expect((float) $resBar['remaining_balance_php'])->toEqual(8500.0);
});

test('calendar schedule accurately handles multi-inventory rooms', function () {
    // Family suite has total_inventory = 2
    // Create 1 reservation for 2026-11-01 to 2026-11-03
    Reservation::create([
        'booking_reference' => 'GR-20261101-FAM1',
        'room_id' => $this->room2->id,
        'guest_id' => $this->guest->id,
        'check_in' => '2026-11-01',
        'check_out' => '2026-11-03',
        'adults' => 4,
        'children' => 0,
        'total_guests' => 4,
        'nights' => 2,
        'nightly_rate_php' => 8500.00,
        'total_price_php' => 17000.00,
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'Maria Santos',
        'guest_email_snapshot' => 'maria@example.com',
        'guest_phone_snapshot' => '+639181112233',
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->getJson('/api/admin/calendar/schedule?start_date=2026-11-01&end_date=2026-11-02');

    $response->assertStatus(200);
    $room2Data = collect($response->json('accommodations'))->firstWhere('id', $this->room2->id);
    $nov1 = collect($room2Data['schedule'])->firstWhere('date', '2026-11-01');

    expect($nov1['total_inventory'])->toBe(2);
    expect($nov1['booked_units'])->toBe(1);
    expect($nov1['available_units'])->toBe(1);
    expect($nov1['status'])->toBe('partially_booked');
});

test('quick check endpoint detects conflicts and prevents double bookings', function () {
    // Deluxe Garden Room (inventory = 1) booked 2026-12-10 to 2026-12-15
    Reservation::create([
        'booking_reference' => 'GR-20261210-OCCU',
        'room_id' => $this->room1->id,
        'guest_id' => $this->guest->id,
        'check_in' => '2026-12-10',
        'check_out' => '2026-12-15',
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 5,
        'nightly_rate_php' => 4500.00,
        'total_price_php' => 22500.00,
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'Maria Santos',
        'guest_email_snapshot' => 'maria@example.com',
        'guest_phone_snapshot' => '+639181112233',
    ]);

    // Check dates that overlap (e.g. 2026-12-12 to 2026-12-14)
    $conflictResponse = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->getJson("/api/admin/calendar/quick-check?check_in=2026-12-12&check_out=2026-12-14&room_id={$this->room1->id}");

    $conflictResponse->assertStatus(200);
    $roomResult = $conflictResponse->json('rooms.0');
    expect($roomResult['is_available'])->toBeFalse();
    expect($roomResult['conflict_detected'])->toBeTrue();
    expect($roomResult['available_units'])->toBe(0);
    expect(count($roomResult['overlapping_reservations']))->toBe(1);
    expect($roomResult['overlapping_reservations'][0]['booking_reference'])->toBe('GR-20261210-OCCU');

    // Check dates starting on checkout day (2026-12-15 to 2026-12-18) -> should be available!
    $availableResponse = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->getJson("/api/admin/calendar/quick-check?check_in=2026-12-15&check_out=2026-12-18&room_id={$this->room1->id}");

    $availableResponse->assertStatus(200);
    $roomAvailResult = $availableResponse->json('rooms.0');
    expect($roomAvailResult['is_available'])->toBeTrue();
    expect($roomAvailResult['conflict_detected'])->toBeFalse();
    expect($roomAvailResult['available_units'])->toBe(1);
    expect(count($roomAvailResult['overlapping_reservations']))->toBe(0);
});
