<?php

use App\Models\Guest;
use App\Models\HousekeepingTask;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::create([
        'name' => 'Front Desk Manager',
        'email' => 'admin@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'admin',
    ]);
    $this->token = $this->admin->createToken('admin-token')->plainTextToken;

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
        'housekeeping_status' => 'inspected',
    ]);

    $this->guest = Guest::create([
        'full_name' => 'Roberto Cruz',
        'email' => 'roberto@example.com',
        'phone' => '+639179998877',
    ]);
});

test('unauthenticated users cannot access check-in and check-out endpoints', function () {
    $this->getJson('/api/admin/check-in-out/overview')->assertStatus(401);
    $this->postJson('/api/admin/check-in-out/1/check-in')->assertStatus(401);
    $this->postJson('/api/admin/check-in-out/1/check-out')->assertStatus(401);
});

test('non-admin users without proper role are forbidden from front desk endpoints', function () {
    $customer = User::create([
        'name' => 'Customer',
        'email' => 'customer@example.com',
        'password' => Hash::make('password123'),
        'role' => 'customer',
    ]);
    $token = $customer->createToken('cust-token')->plainTextToken;

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/admin/check-in-out/overview')
        ->assertStatus(403);
});

test('daily overview returns expected arrivals, departures, in-house guests, and metrics', function () {
    $today = Carbon::today()->toDateString();
    $tomorrow = Carbon::tomorrow()->toDateString();
    $yesterday = Carbon::yesterday()->toDateString();

    // 1. Arrival today
    $arrivalRes = Reservation::create([
        'booking_reference' => 'GR-ARR-001',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => $today,
        'check_out' => $tomorrow,
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 1,
        'nightly_rate_php' => 4500.00,
        'total_price_php' => 4500.00,
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'Roberto Cruz',
        'guest_email_snapshot' => 'roberto@example.com',
        'guest_phone_snapshot' => '+639179998877',
    ]);

    // Full payment for arrival
    Payment::create([
        'payment_reference' => 'PAY-ARR-001',
        'reservation_id' => $arrivalRes->id,
        'amount' => 4500.00,
        'currency' => 'PHP',
        'payment_method' => 'credit_card',
        'status' => 'completed',
        'recorded_by_user_id' => $this->admin->id,
    ]);

    // 2. In-house guest departing today
    $inHouseRes = Reservation::create([
        'booking_reference' => 'GR-DEP-002',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => $yesterday,
        'check_out' => $today,
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 1,
        'nightly_rate_php' => 4500.00,
        'total_price_php' => 4500.00,
        'currency' => 'PHP',
        'status' => 'checked_in',
        'checked_in_at' => Carbon::yesterday()->setHour(14),
        'checked_in_by_user_id' => $this->admin->id,
        'guest_name_snapshot' => 'Roberto Cruz',
        'guest_email_snapshot' => 'roberto@example.com',
        'guest_phone_snapshot' => '+639179998877',
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->getJson("/api/admin/check-in-out/overview?date={$today}");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'date',
            'metrics' => [
                'total_arrivals',
                'arrived_count',
                'pending_arrivals',
                'unpaid_arrivals',
                'total_departures',
                'departed_count',
                'pending_departures',
                'overdue_departures',
                'in_house_count',
            ],
            'arrivals',
            'departures',
            'in_house',
        ]);

    $data = $response->json();
    expect($data['metrics']['total_arrivals'])->toBe(1);
    expect($data['metrics']['pending_arrivals'])->toBe(1);
    expect($data['metrics']['total_departures'])->toBe(1);
    expect($data['metrics']['in_house_count'])->toBe(1);

    // Verify arrival details
    $arrivalItem = $data['arrivals'][0];
    expect($arrivalItem['booking_reference'])->toBe('GR-ARR-001');
    expect($arrivalItem['payment_status'])->toBe('paid');
    expect($arrivalItem['has_outstanding_balance'])->toBeFalse();
    expect($arrivalItem['is_room_ready'])->toBeTrue();
});

test('front desk can check in a guest and records operational timestamps and staff attribution', function () {
    $res = Reservation::create([
        'booking_reference' => 'GR-CHECKIN-TEST',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => Carbon::today()->toDateString(),
        'check_out' => Carbon::tomorrow()->toDateString(),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 1,
        'nightly_rate_php' => 4500.00,
        'total_price_php' => 4500.00,
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'Roberto Cruz',
        'guest_email_snapshot' => 'roberto@example.com',
        'guest_phone_snapshot' => '+639179998877',
    ]);

    Payment::create([
        'payment_reference' => 'PAY-CI-001',
        'reservation_id' => $res->id,
        'amount' => 4500.00,
        'currency' => 'PHP',
        'payment_method' => 'cash',
        'status' => 'completed',
        'recorded_by_user_id' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->postJson("/api/admin/check-in-out/{$res->id}/check-in", [
            'notes' => 'Guest presented passport; keycard #102 issued.',
        ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'message',
            'reservation' => [
                'id',
                'booking_reference',
                'status',
                'checked_in_at',
                'checked_in_by',
                'check_in_notes',
            ],
        ]);

    $freshRes = $res->fresh();
    expect($freshRes->status)->toBe('checked_in');
    expect($freshRes->checked_in_at)->not->toBeNull();
    expect($freshRes->checked_in_by_user_id)->toBe($this->admin->id);
    expect($freshRes->check_in_notes)->toContain('keycard #102 issued');
    expect($freshRes->isCheckedIn)->toBeTrue();
});

test('check-in warns about outstanding balance and requires acknowledgment or payment', function () {
    $res = Reservation::create([
        'booking_reference' => 'GR-UNPAID-CHECKIN',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => Carbon::today()->toDateString(),
        'check_out' => Carbon::tomorrow()->toDateString(),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 1,
        'nightly_rate_php' => 4500.00,
        'total_price_php' => 4500.00,
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'Roberto Cruz',
        'guest_email_snapshot' => 'roberto@example.com',
        'guest_phone_snapshot' => '+639179998877',
    ]);

    // 1. Check in without acknowledgment -> returns 422 warning
    $failResponse = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->postJson("/api/admin/check-in-out/{$res->id}/check-in", [
            'notes' => 'Attempting check-in without settling balance',
        ]);

    $failResponse->assertStatus(422);
    expect($failResponse->json('requires_acknowledgment'))->toBeTrue();
    expect($failResponse->json('remaining_balance_php'))->toEqual(4500.0);

    // 2. Check in with explicit acknowledgment -> succeeds
    $successResponse = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->postJson("/api/admin/check-in-out/{$res->id}/check-in", [
            'notes' => 'Guest promised to settle via cash upon dinner service.',
            'acknowledge_balance' => true,
        ]);

    $successResponse->assertStatus(200);
    expect($res->fresh()->status)->toBe('checked_in');
});

test('front desk can check out a guest, records timestamps, flags room as dirty, and triggers turnover task', function () {
    $res = Reservation::create([
        'booking_reference' => 'GR-CHECKOUT-TEST',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => Carbon::yesterday()->toDateString(),
        'check_out' => Carbon::today()->toDateString(),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 1,
        'nightly_rate_php' => 4500.00,
        'total_price_php' => 4500.00,
        'currency' => 'PHP',
        'status' => 'checked_in',
        'checked_in_at' => Carbon::yesterday()->setHour(15),
        'checked_in_by_user_id' => $this->admin->id,
        'guest_name_snapshot' => 'Roberto Cruz',
        'guest_email_snapshot' => 'roberto@example.com',
        'guest_phone_snapshot' => '+639179998877',
    ]);

    Payment::create([
        'payment_reference' => 'PAY-CO-001',
        'reservation_id' => $res->id,
        'amount' => 4500.00,
        'currency' => 'PHP',
        'payment_method' => 'bank_transfer',
        'status' => 'completed',
        'recorded_by_user_id' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->token}")
        ->postJson("/api/admin/check-in-out/{$res->id}/check-out", [
            'notes' => 'Returned 2 keycards. Expressed high satisfaction.',
        ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'message',
            'reservation' => [
                'id',
                'booking_reference',
                'status',
                'checked_out_at',
                'checked_out_by',
                'check_out_notes',
                'room_housekeeping_status',
            ],
        ]);

    $freshRes = $res->fresh();
    expect($freshRes->status)->toBe('completed');
    expect($freshRes->checked_out_at)->not->toBeNull();
    expect($freshRes->checked_out_by_user_id)->toBe($this->admin->id);

    // Verify room was automatically transitioned to dirty condition
    $freshRoom = $this->room->fresh();
    expect($freshRoom->housekeeping_status)->toBe('dirty');

    // Verify turnover cleaning task was created
    $task = HousekeepingTask::where('room_id', $this->room->id)->latest('id')->first();
    expect($task)->not->toBeNull();
    expect($task->task_type)->toBe('cleaning');
    expect($task->priority)->toBe('high');
    expect($task->notes)->toContain('GR-CHECKOUT-TEST');
});

test('duplicate check-in and invalid check-out transitions are rejected with 422', function () {
    // 1. Cannot check in an already checked-in reservation
    $checkedInRes = Reservation::create([
        'booking_reference' => 'GR-DUP-CI',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => Carbon::today()->toDateString(),
        'check_out' => Carbon::tomorrow()->toDateString(),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 1,
        'nightly_rate_php' => 4500.00,
        'total_price_php' => 4500.00,
        'currency' => 'PHP',
        'status' => 'checked_in',
        'guest_name_snapshot' => 'Roberto Cruz',
        'guest_email_snapshot' => 'roberto@example.com',
        'guest_phone_snapshot' => '+639179998877',
    ]);

    $this->withHeader('Authorization', "Bearer {$this->token}")
        ->postJson("/api/admin/check-in-out/{$checkedInRes->id}/check-in")
        ->assertStatus(422);

    // 2. Cannot check out a reservation that is not checked_in
    $confirmedRes = Reservation::create([
        'booking_reference' => 'GR-NOT-CI',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => Carbon::today()->toDateString(),
        'check_out' => Carbon::tomorrow()->toDateString(),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 1,
        'nightly_rate_php' => 4500.00,
        'total_price_php' => 4500.00,
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'Roberto Cruz',
        'guest_email_snapshot' => 'roberto@example.com',
        'guest_phone_snapshot' => '+639179998877',
    ]);

    $this->withHeader('Authorization', "Bearer {$this->token}")
        ->postJson("/api/admin/check-in-out/{$confirmedRes->id}/check-out")
        ->assertStatus(422);
});
