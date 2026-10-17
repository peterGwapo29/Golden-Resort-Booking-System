<?php

use App\Models\Guest;
use App\Models\Reservation;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->room = Room::create([
        'slug' => 'ocean-suite',
        'name' => 'Ocean Suite',
        'category' => 'suite',
        'tagline' => 'Ocean suite tagline',
        'description' => 'Ocean suite description',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 8000.00,
        'total_inventory' => 1,
        'max_guests' => 3,
        'adults_capacity' => 2,
        'children_capacity' => 1,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 50,
        'view' => 'Ocean',
        'amenities' => ['Balcony', 'Wi-Fi'],
        'featured_image' => ['src' => 'https://example.com/img.jpg', 'alt' => 'test', 'source' => 'https://example.com'],
        'gallery' => [],
        'is_active' => true,
    ]);
});

test('can create a valid reservation successfully', function () {
    $checkIn = Carbon::tomorrow()->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(2)->format('Y-m-d');

    $payload = [
        'room_slug' => 'ocean-suite',
        'check_in' => $checkIn,
        'check_out' => $checkOut,
        'adults' => 2,
        'children' => 1,
        'guest_full_name' => 'Juan Dela Cruz',
        'guest_email' => 'juan@example.com',
        'guest_phone' => '+63 918 123 4567',
        'special_requests' => 'Quiet floor please',
    ];

    $response = $this->postJson('/api/reservations', $payload);

    $response->assertStatus(201)
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.stay.nights', 2)
        ->assertJsonPath('data.stay.total_guests', 3)
        ->assertJsonPath('data.pricing.nightly_rate_php', 8000)
        ->assertJsonPath('data.pricing.total_price_php', 16000)
        ->assertJsonPath('data.guest.full_name', 'Juan Dela Cruz')
        ->assertJsonPath('data.guest.email', 'juan@example.com');

    $this->assertDatabaseHas('reservations', [
        'room_id' => $this->room->id,
        'guest_email_snapshot' => 'juan@example.com',
        'nights' => 2,
        'total_price_php' => 16000.00,
        'status' => 'pending',
    ]);

    $this->assertDatabaseHas('guests', [
        'email' => 'juan@example.com',
        'full_name' => 'Juan Dela Cruz',
    ]);
});

test('server calculates total price and ignores client pricing attempts', function () {
    $checkIn = Carbon::tomorrow()->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(3)->format('Y-m-d');

    $payload = [
        'room_slug' => 'ocean-suite',
        'check_in' => $checkIn,
        'check_out' => $checkOut,
        'adults' => 2,
        'guest_full_name' => 'Ana Reyes',
        'guest_email' => 'ana@example.com',
        'guest_phone' => '+63 917 999 8888',
        'nightly_rate_php' => 1.00, // malicious client attempt
        'total_price_php' => 1.00,  // malicious client attempt
        'status' => 'confirmed',     // client attempt to force confirmed
    ];

    $response = $this->postJson('/api/reservations', $payload);

    // 3 nights * 8000 = 24000
    $response->assertStatus(201)
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.pricing.nightly_rate_php', 8000)
        ->assertJsonPath('data.pricing.total_price_php', 24000);

    $this->assertDatabaseHas('reservations', [
        'guest_email_snapshot' => 'ana@example.com',
        'nightly_rate_php' => 8000.00,
        'total_price_php' => 24000.00,
        'status' => 'pending',
    ]);
});

test('rejects reservation exceeding room guest capacity', function () {
    $checkIn = Carbon::tomorrow()->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(2)->format('Y-m-d');

    // Room max_guests is 3; requesting 2 adults + 2 children = 4
    $payload = [
        'room_slug' => 'ocean-suite',
        'check_in' => $checkIn,
        'check_out' => $checkOut,
        'adults' => 2,
        'children' => 2,
        'guest_full_name' => 'Big Family',
        'guest_email' => 'family@example.com',
        'guest_phone' => '+63 917 555 4444',
    ];

    $response = $this->postJson('/api/reservations', $payload);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['guests']);
});

test('rejects overlapping reservation for same room with 409 Conflict', function () {
    $checkIn = Carbon::tomorrow()->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(4)->format('Y-m-d');

    // First booking takes the room
    $firstPayload = [
        'room_slug' => 'ocean-suite',
        'check_in' => $checkIn,
        'check_out' => $checkOut,
        'adults' => 2,
        'guest_full_name' => 'First Booker',
        'guest_email' => 'first@example.com',
        'guest_phone' => '+63 917 111 2222',
    ];
    $this->postJson('/api/reservations', $firstPayload)->assertStatus(201);

    // Second booking overlaps (starts day 2 of stay)
    $secondPayload = [
        'room_slug' => 'ocean-suite',
        'check_in' => Carbon::tomorrow()->addDay()->format('Y-m-d'),
        'check_out' => Carbon::tomorrow()->addDays(3)->format('Y-m-d'),
        'adults' => 2,
        'guest_full_name' => 'Second Booker',
        'guest_email' => 'second@example.com',
        'guest_phone' => '+63 917 333 4444',
    ];

    $response = $this->postJson('/api/reservations', $secondPayload);

    $response->assertStatus(409)
        ->assertJsonFragment(['message' => 'The selected accommodation is no longer available for the requested dates.']);
});

test('allows adjacent non-overlapping stays', function () {
    $day1 = Carbon::tomorrow()->format('Y-m-d');
    $day3 = Carbon::tomorrow()->addDays(2)->format('Y-m-d');
    $day5 = Carbon::tomorrow()->addDays(4)->format('Y-m-d');

    // Guest A stays day 1 to day 3
    $this->postJson('/api/reservations', [
        'room_slug' => 'ocean-suite',
        'check_in' => $day1,
        'check_out' => $day3,
        'adults' => 2,
        'guest_full_name' => 'Guest A',
        'guest_email' => 'guestA@example.com',
        'guest_phone' => '+63 917 111 1111',
    ])->assertStatus(201);

    // Guest B checks in on day 3 (Guest A's checkout day) and stays to day 5
    $response = $this->postJson('/api/reservations', [
        'room_slug' => 'ocean-suite',
        'check_in' => $day3,
        'check_out' => $day5,
        'adults' => 2,
        'guest_full_name' => 'Guest B',
        'guest_email' => 'guestB@example.com',
        'guest_phone' => '+63 917 222 2222',
    ]);

    $response->assertStatus(201);
});

test('cancelled reservations do not block inventory', function () {
    $checkIn = Carbon::tomorrow()->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(2)->format('Y-m-d');

    $guest = Guest::create([
        'full_name' => 'Cancelled Guest',
        'email' => 'cancelled@example.com',
        'phone' => '+639178888888',
    ]);

    $res = Reservation::create([
        'booking_reference' => 'GR-20261018-CANC',
        'room_id' => $this->room->id,
        'guest_id' => $guest->id,
        'check_in' => $checkIn,
        'check_out' => $checkOut,
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 2,
        'nightly_rate_php' => 8000.00,
        'total_price_php' => 16000.00,
        'currency' => 'PHP',
        'status' => 'cancelled', // Cancelled!
        'guest_name_snapshot' => 'Cancelled Guest',
        'guest_email_snapshot' => 'cancelled@example.com',
        'guest_phone_snapshot' => '+639178888888',
    ]);

    // A new guest books the exact same dates
    $response = $this->postJson('/api/reservations', [
        'room_slug' => 'ocean-suite',
        'check_in' => $checkIn,
        'check_out' => $checkOut,
        'adults' => 2,
        'guest_full_name' => 'New Guest',
        'guest_email' => 'new@example.com',
        'guest_phone' => '+63 917 777 7777',
    ]);

    $response->assertStatus(201);
});

test('can retrieve reservation with matching email and cannot with incorrect email', function () {
    $checkIn = Carbon::tomorrow()->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(2)->format('Y-m-d');

    $res = $this->postJson('/api/reservations', [
        'room_slug' => 'ocean-suite',
        'check_in' => $checkIn,
        'check_out' => $checkOut,
        'adults' => 2,
        'guest_full_name' => 'Secret Guest',
        'guest_email' => 'secret@example.com',
        'guest_phone' => '+63 917 666 5555',
    ]);

    $ref = $res->json('data.booking_reference');

    // Retrieve with correct email
    $this->getJson("/api/reservations/{$ref}?email=secret@example.com")
        ->assertStatus(200)
        ->assertJsonPath('data.booking_reference', $ref)
        ->assertJsonPath('data.guest.full_name', 'Secret Guest');

    // Retrieve with wrong email fails with 404
    $this->getJson("/api/reservations/{$ref}?email=intruder@example.com")
        ->assertStatus(404);

    // Retrieve without email fails with 422
    $this->getJson("/api/reservations/{$ref}")
        ->assertStatus(422);
});
