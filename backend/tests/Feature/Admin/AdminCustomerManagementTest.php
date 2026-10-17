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
        'slug' => 'deluxe-suite',
        'name' => 'Deluxe Suite',
        'category' => 'suite',
        'tagline' => 'Deluxe Suite',
        'description' => 'Deluxe Suite',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 10000.00,
        'total_inventory' => 2,
        'max_guests' => 4,
        'adults_capacity' => 2,
        'children_capacity' => 2,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 50,
        'view' => 'Garden',
        'amenities' => ['Wi-Fi'],
        'featured_image' => ['src' => 'https://example.com/img.jpg', 'alt' => 'test', 'source' => 'https://example.com'],
        'gallery' => [],
        'is_active' => true,
    ]);

    $this->guest = Guest::create([
        'full_name' => 'Maria Clara',
        'email' => 'maria@test.com',
        'phone' => '+639170001111',
    ]);

    Reservation::create([
        'booking_reference' => 'GR-20261018-MC01',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => Carbon::tomorrow()->format('Y-m-d'),
        'check_out' => Carbon::tomorrow()->addDays(2)->format('Y-m-d'),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 2,
        'nightly_rate_php' => 10000.00,
        'total_price_php' => 20000.00,
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'Maria Clara',
        'guest_email_snapshot' => 'maria@test.com',
        'guest_phone_snapshot' => '+639170001111',
    ]);
});

test('admin can list customers with search', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson('/api/admin/customers?search=Maria');

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.full_name', 'Maria Clara')
        ->assertJsonPath('data.0.total_reservations', 1);
});

test('admin can view single customer profile and booking history', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson("/api/admin/customers/{$this->guest->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.full_name', 'Maria Clara')
        ->assertJsonPath('data.stats.total_reservations', 1)
        ->assertJsonPath('data.stats.total_spent_php', 20000)
        ->assertJsonPath('data.reservations.0.id', fn ($id) => is_numeric($id));
});
