<?php

use App\Models\AccommodationRestriction;
use App\Models\Guest;
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
        'name' => 'Admin Boss',
        'email' => 'admin@goldenresort.test',
        'password' => Hash::make('password123'),
        'role' => 'admin',
        'is_active' => true,
    ]);
    $this->adminToken = $this->admin->createToken('admin-token')->plainTextToken;

    $this->frontDesk = User::create([
        'name' => 'Front Desk Joy',
        'email' => 'frontdesk@goldenresort.test',
        'password' => Hash::make('password123'),
        'role' => 'front_desk',
        'is_active' => true,
    ]);
    $this->frontDeskToken = $this->frontDesk->createToken('front-desk-token')->plainTextToken;

    $this->housekeeper = User::create([
        'name' => 'Housekeeper Maria',
        'email' => 'maria@goldenresort.test',
        'password' => Hash::make('password123'),
        'role' => 'housekeeper',
        'is_active' => true,
    ]);
    $this->housekeeperToken = $this->housekeeper->createToken('hk-token')->plainTextToken;

    $this->room = Room::create([
        'slug' => 'deluxe-villa',
        'name' => 'Deluxe Villa',
        'category' => 'villa',
        'tagline' => 'Luxury villa experience',
        'description' => 'Spacious villa with private terrace',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 15000.00,
        'total_inventory' => 1,
        'max_guests' => 4,
        'adults_capacity' => 4,
        'children_capacity' => 2,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 120,
        'view' => 'Ocean',
        'amenities' => ['Wi-Fi', 'Pool', 'Breakfast'],
        'featured_image' => ['src' => 'https://example.com/villa.jpg', 'alt' => 'test', 'source' => 'https://example.com'],
        'gallery' => [],
        'is_active' => true,
    ]);
});

test('admin can create a walk-in reservation with server-calculated pricing and creator attribution', function () {
    $checkIn = Carbon::tomorrow()->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(2)->format('Y-m-d');

    $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->postJson('/api/admin/reservations', [
            'room_id' => $this->room->id,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'adults' => 2,
            'children' => 1,
            'guest_full_name' => 'Juan Dela Cruz',
            'guest_email' => 'juan@example.ph',
            'guest_phone' => '+639171234567',
            'booking_source' => 'walk_in',
            'status' => 'confirmed',
            'special_requests' => 'Requires late check-out if possible.',
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.booking_source', 'walk_in')
        ->assertJsonPath('data.nights', 2)
        ->assertJsonPath('data.total_price_php', 30000)
        ->assertJsonPath('data.status', 'confirmed')
        ->assertJsonPath('data.created_by.id', $this->admin->id)
        ->assertJsonPath('data.created_by.name', 'Admin Boss');

    $createdRef = $response->json('data.booking_reference');
    expect($createdRef)->toStartWith('GR-');

    $this->assertDatabaseHas('reservations', [
        'booking_reference' => $createdRef,
        'room_id' => $this->room->id,
        'booking_source' => 'walk_in',
        'created_by_user_id' => $this->admin->id,
        'nights' => 2,
        'total_price_php' => 30000.00,
        'guest_name_snapshot' => 'Juan Dela Cruz',
        'guest_email_snapshot' => 'juan@example.ph',
    ]);
});

test('front desk staff can create a phone reservation', function () {
    $checkIn = Carbon::tomorrow()->addDays(5)->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(7)->format('Y-m-d');

    $response = $this->withHeader('Authorization', 'Bearer '.$this->frontDeskToken)
        ->postJson('/api/admin/reservations', [
            'room_id' => $this->room->id,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'adults' => 2,
            'guest_full_name' => 'Maria Clara',
            'guest_email' => 'maria.clara@example.ph',
            'guest_phone' => '+639189876543',
            'booking_source' => 'phone',
            'status' => 'pending',
            'special_requests' => 'Caller requested quiet room.',
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.booking_source', 'phone')
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.created_by.id', $this->frontDesk->id)
        ->assertJsonPath('data.created_by.name', 'Front Desk Joy');
});

test('walk-in creation with atomic initial payment records payment in financial ledger', function () {
    $checkIn = Carbon::tomorrow()->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(3)->format('Y-m-d'); // 3 nights = 45,000

    $response = $this->withHeader('Authorization', 'Bearer '.$this->frontDeskToken)
        ->postJson('/api/admin/reservations', [
            'room_id' => $this->room->id,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'adults' => 2,
            'guest_full_name' => 'Crisostomo Ibarra',
            'guest_email' => 'ibarra@example.ph',
            'guest_phone' => '+639191112222',
            'booking_source' => 'walk_in',
            'status' => 'confirmed',
            'initial_payment' => [
                'amount' => 20000.00,
                'payment_method' => 'cash',
                'notes' => '₱20,000 cash deposit received at front desk.',
            ],
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.total_price_php', 45000)
        ->assertJsonPath('data.total_paid_php', 20000)
        ->assertJsonPath('data.remaining_balance_php', 25000)
        ->assertJsonPath('data.payment_status', 'partially_paid');

    $reservationId = $response->json('data.id');

    $this->assertDatabaseHas('payments', [
        'reservation_id' => $reservationId,
        'amount' => 20000.00,
        'payment_method' => 'cash',
        'status' => 'completed',
        'recorded_by_user_id' => $this->frontDesk->id,
    ]);
});

test('creation fails if room capacity is exceeded', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->postJson('/api/admin/reservations', [
            'room_id' => $this->room->id,
            'check_in' => Carbon::tomorrow()->format('Y-m-d'),
            'check_out' => Carbon::tomorrow()->addDay()->format('Y-m-d'),
            'adults' => 4,
            'children' => 3, // Total 7 > max_guests 4
            'guest_full_name' => 'Big Family',
            'guest_email' => 'bigfamily@example.ph',
            'guest_phone' => '+639171234567',
            'booking_source' => 'walk_in',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['guests']);
});

test('creation fails with 409 conflict if room is already booked for overlapping dates', function () {
    $existingGuest = Guest::create([
        'full_name' => 'Existing Booker',
        'email' => 'existing@test.com',
        'phone' => '+639170000000',
    ]);

    Reservation::create([
        'booking_reference' => 'GR-20261019-EXIST',
        'room_id' => $this->room->id,
        'guest_id' => $existingGuest->id,
        'check_in' => Carbon::tomorrow()->format('Y-m-d'),
        'check_out' => Carbon::tomorrow()->addDays(2)->format('Y-m-d'),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 2,
        'nightly_rate_php' => 15000.00,
        'total_price_php' => 30000.00,
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'Existing Booker',
        'guest_email_snapshot' => 'existing@test.com',
        'guest_phone_snapshot' => '+639170000000',
    ]);

    // Admin attempts to book the same room on overlapping dates
    $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->postJson('/api/admin/reservations', [
            'room_id' => $this->room->id,
            'check_in' => Carbon::tomorrow()->addDay()->format('Y-m-d'),
            'check_out' => Carbon::tomorrow()->addDays(3)->format('Y-m-d'),
            'adults' => 2,
            'guest_full_name' => 'Walk In Guest',
            'guest_email' => 'walkin@example.ph',
            'guest_phone' => '+639171111111',
            'booking_source' => 'walk_in',
        ]);

    $response->assertStatus(409)
        ->assertJsonFragment(['message' => 'The selected accommodation is no longer available for the requested dates due to existing bookings or maintenance restrictions.']);
});

test('creation fails with 409 conflict if room has an active maintenance restriction', function () {
    AccommodationRestriction::create([
        'restriction_number' => 'RES-20261019-001',
        'room_id' => $this->room->id,
        'title' => 'Plumbing Repair',
        'reason' => 'Emergency pipe leak repair',
        'restriction_type' => 'maintenance',
        'start_date' => Carbon::tomorrow()->format('Y-m-d'),
        'end_date' => Carbon::tomorrow()->addDays(3)->format('Y-m-d'),
        'blocked_units' => 1,
        'status' => 'active',
        'created_by' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->frontDeskToken)
        ->postJson('/api/admin/reservations', [
            'room_id' => $this->room->id,
            'check_in' => Carbon::tomorrow()->format('Y-m-d'),
            'check_out' => Carbon::tomorrow()->addDays(2)->format('Y-m-d'),
            'adults' => 2,
            'guest_full_name' => 'Walk In Guest',
            'guest_email' => 'walkin@example.ph',
            'guest_phone' => '+639171111111',
            'booking_source' => 'walk_in',
        ]);

    $response->assertStatus(409)
        ->assertJsonFragment(['message' => 'The selected accommodation is no longer available for the requested dates due to existing bookings or maintenance restrictions.']);
});

test('unauthorized staff cannot create reservations', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->housekeeperToken)
        ->postJson('/api/admin/reservations', [
            'room_id' => $this->room->id,
            'check_in' => Carbon::tomorrow()->format('Y-m-d'),
            'check_out' => Carbon::tomorrow()->addDay()->format('Y-m-d'),
            'adults' => 1,
            'guest_full_name' => 'Sneaky Attempt',
            'guest_email' => 'sneaky@test.com',
            'guest_phone' => '+639170000000',
            'booking_source' => 'walk_in',
        ]);

    $response->assertStatus(403);
});
