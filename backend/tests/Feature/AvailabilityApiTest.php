<?php

use App\Models\Guest;
use App\Models\Reservation;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->room = Room::create([
        'slug' => 'garden-villa',
        'name' => 'Garden Villa',
        'category' => 'villa',
        'tagline' => 'A serene villa',
        'description' => 'A serene villa description',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 10000.00,
        'total_inventory' => 1,
        'max_guests' => 3,
        'adults_capacity' => 2,
        'children_capacity' => 1,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 60,
        'view' => 'Garden',
        'amenities' => ['Pool', 'Wi-Fi'],
        'featured_image' => ['src' => 'https://example.com/img.jpg', 'alt' => 'test', 'source' => 'https://example.com'],
        'gallery' => [],
        'is_active' => true,
    ]);
});

test('searching availability returns free rooms', function () {
    $checkIn = Carbon::tomorrow()->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(2)->format('Y-m-d');

    $response = $this->getJson("/api/availability?check_in={$checkIn}&check_out={$checkOut}&adults=2&children=0");

    $response->assertStatus(200)
        ->assertJsonPath('search.nights', 2)
        ->assertJsonPath('search.total_guests', 2)
        ->assertJsonCount(1, 'available_rooms')
        ->assertJsonPath('available_rooms.0.slug', 'garden-villa')
        ->assertJsonPath('available_rooms.0.calculated_total_php', 20000);
});

test('search rejects checkin in the past', function () {
    $checkIn = Carbon::yesterday()->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->format('Y-m-d');

    $response = $this->getJson("/api/availability?check_in={$checkIn}&check_out={$checkOut}&adults=2");

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['check_in']);
});

test('search rejects checkout before or same as checkin', function () {
    $date = Carbon::tomorrow()->format('Y-m-d');

    $response = $this->getJson("/api/availability?check_in={$date}&check_out={$date}&adults=2");

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['check_out']);
});

test('search rejects invalid guest counts', function () {
    $checkIn = Carbon::tomorrow()->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(1)->format('Y-m-d');

    $response = $this->getJson("/api/availability?check_in={$checkIn}&check_out={$checkOut}&adults=0");

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['adults']);
});

test('search excludes rooms where total guests exceeds room capacity', function () {
    $checkIn = Carbon::tomorrow()->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(2)->format('Y-m-d');

    // Garden villa max_guests is 3; requesting 4 total guests
    $response = $this->getJson("/api/availability?check_in={$checkIn}&check_out={$checkOut}&adults=3&children=1");

    $response->assertStatus(200)
        ->assertJsonCount(0, 'available_rooms');
});

test('search excludes room when inventory is fully booked by overlapping active reservation', function () {
    $checkIn = Carbon::tomorrow()->format('Y-m-d');
    $checkOut = Carbon::tomorrow()->addDays(3)->format('Y-m-d');

    $guest = Guest::create([
        'full_name' => 'Existing Guest',
        'email' => 'existing@example.com',
        'phone' => '+639170000000',
    ]);

    // Book the single unit
    Reservation::create([
        'booking_reference' => 'GR-20261018-TEST',
        'room_id' => $this->room->id,
        'guest_id' => $guest->id,
        'check_in' => $checkIn,
        'check_out' => $checkOut,
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 3,
        'nightly_rate_php' => 10000.00,
        'total_price_php' => 30000.00,
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'Existing Guest',
        'guest_email_snapshot' => 'existing@example.com',
        'guest_phone_snapshot' => '+639170000000',
    ]);

    // Attempt searching the overlapping window
    $searchIn = Carbon::tomorrow()->addDay()->format('Y-m-d');
    $searchOut = Carbon::tomorrow()->addDays(2)->format('Y-m-d');

    $response = $this->getJson("/api/availability?check_in={$searchIn}&check_out={$searchOut}&adults=2");

    $response->assertStatus(200)
        ->assertJsonCount(0, 'available_rooms');
});
