<?php

use App\Models\Guest;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::create([
        'name' => 'Admin User',
        'email' => 'admin@test.com',
        'password' => Hash::make('password123'),
        'role' => 'admin',
    ]);
    $this->token = $this->admin->createToken('admin-token')->plainTextToken;

    $this->room = Room::create([
        'slug' => 'presidential-villa',
        'name' => 'Presidential Villa',
        'category' => 'villa',
        'tagline' => 'Luxury beyond compare',
        'description' => 'A grand villa description',
        'long_description' => ['Paragraph 1', 'Paragraph 2'],
        'nightly_rate_php' => 35000.00,
        'total_inventory' => 1,
        'max_guests' => 6,
        'adults_capacity' => 4,
        'children_capacity' => 2,
        'bed_configuration' => '2 King Beds',
        'size_sqm' => 180,
        'view' => 'Ocean & Sunset',
        'amenities' => ['Private Pool', 'Butler Service'],
        'featured_image' => ['src' => 'https://example.com/img.jpg', 'alt' => 'villa', 'source' => 'https://example.com'],
        'gallery' => [],
        'is_active' => true,
    ]);
});

test('admin can list all rooms including inactive ones', function () {
    Room::create([
        'slug' => 'hidden-room',
        'name' => 'Hidden Room',
        'category' => 'room',
        'tagline' => 'Hidden',
        'description' => 'Hidden description',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 4000.00,
        'total_inventory' => 1,
        'max_guests' => 2,
        'adults_capacity' => 2,
        'children_capacity' => 0,
        'bed_configuration' => '1 Bed',
        'size_sqm' => 30,
        'view' => 'Courtyard',
        'amenities' => [],
        'featured_image' => ['src' => 'https://example.com/img2.jpg', 'alt' => 'hidden', 'source' => 'https://example.com'],
        'gallery' => [],
        'is_active' => false,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson('/api/admin/rooms');

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.is_active', false)
        ->assertJsonPath('data.1.is_active', true);
});

test('admin can create a new accommodation with valid payload', function () {
    $payload = [
        'name' => 'Royal Sunset Suite',
        'slug' => 'royal-sunset-suite',
        'category' => 'suite',
        'tagline' => 'Breathtaking ocean sunsets from your private balcony',
        'description' => 'A royal suite experience',
        'long_description' => ['Full description here'],
        'nightly_rate_php' => 15000.00,
        'total_inventory' => 3,
        'max_guests' => 4,
        'adults_capacity' => 3,
        'children_capacity' => 2,
        'bed_configuration' => '1 King Bed + 1 Daybed',
        'size_sqm' => 85,
        'view' => 'Sunset Ocean View',
        'amenities' => ['Balcony', 'Jacuzzi'],
        'featured_image' => ['src' => 'https://example.com/sunset.jpg', 'alt' => 'Sunset Suite', 'source' => 'https://example.com'],
        'gallery' => [],
        'is_active' => true,
    ];

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson('/api/admin/rooms', $payload);

    $response->assertStatus(201)
        ->assertJsonPath('data.slug', 'royal-sunset-suite')
        ->assertJsonPath('data.nightly_rate_php', 15000);

    $this->assertDatabaseHas('rooms', ['slug' => 'royal-sunset-suite']);
});

test('admin can update accommodation rate and details without altering existing reservation snapshots', function () {
    $guest = Guest::create(['full_name' => 'Loyal Guest', 'email' => 'loyal@test.com', 'phone' => '+639171112222']);

    $res = Reservation::create([
        'booking_reference' => 'GR-20261018-SNAP',
        'room_id' => $this->room->id,
        'guest_id' => $guest->id,
        'check_in' => Carbon::tomorrow()->format('Y-m-d'),
        'check_out' => Carbon::tomorrow()->addDays(2)->format('Y-m-d'),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 2,
        'nightly_rate_php' => 35000.00, // Snapshot
        'total_price_php' => 70000.00,  // Snapshot
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'Loyal Guest',
        'guest_email_snapshot' => 'loyal@test.com',
        'guest_phone_snapshot' => '+639171112222',
    ]);

    // Update room rate to 45,000 PHP
    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->putJson("/api/admin/rooms/{$this->room->id}", [
            'name' => 'Presidential Villa Deluxe',
            'slug' => 'presidential-villa',
            'category' => 'villa',
            'tagline' => 'Luxury beyond compare - updated',
            'description' => 'Updated description',
            'long_description' => ['Paragraph 1'],
            'nightly_rate_php' => 45000.00,
            'total_inventory' => 1,
            'max_guests' => 6,
            'adults_capacity' => 4,
            'children_capacity' => 2,
            'bed_configuration' => '2 King Beds',
            'size_sqm' => 180,
            'view' => 'Ocean & Sunset',
            'amenities' => ['Private Pool', 'Butler Service', 'Spa Pass'],
            'featured_image' => ['src' => 'https://example.com/img.jpg', 'alt' => 'villa', 'source' => 'https://example.com'],
            'gallery' => [],
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.nightly_rate_php', 45000);

    // Assert existing reservation preserved its locked price snapshots
    $res->refresh();
    expect((float) $res->nightly_rate_php)->toBe(35000.00);
    expect((float) $res->total_price_php)->toBe(70000.00);
});

test('admin can toggle accommodation active status', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->patchJson("/api/admin/rooms/{$this->room->id}/toggle-active");

    $response->assertStatus(200)
        ->assertJsonPath('is_active', false);

    expect($this->room->fresh()->is_active)->toBeFalse();
});

test('admin cannot delete accommodation with historical reservations', function () {
    $guest = Guest::create(['full_name' => 'History Guest', 'email' => 'hist@test.com', 'phone' => '+639170000000']);
    Reservation::create([
        'booking_reference' => 'GR-20261018-HIST',
        'room_id' => $this->room->id,
        'guest_id' => $guest->id,
        'check_in' => Carbon::tomorrow()->format('Y-m-d'),
        'check_out' => Carbon::tomorrow()->addDay()->format('Y-m-d'),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 1,
        'nightly_rate_php' => 35000.00,
        'total_price_php' => 35000.00,
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'History Guest',
        'guest_email_snapshot' => 'hist@test.com',
        'guest_phone_snapshot' => '+639170000000',
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->deleteJson("/api/admin/rooms/{$this->room->id}");

    $response->assertStatus(422)
        ->assertJsonFragment(['message' => 'Cannot delete accommodation with existing reservation history. You may deactivate it instead.']);
});
