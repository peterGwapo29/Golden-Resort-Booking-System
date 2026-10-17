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
        'slug' => 'grand-suite',
        'name' => 'Grand Suite',
        'category' => 'suite',
        'tagline' => 'Grand suite tagline',
        'description' => 'Grand suite description',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 12000.00,
        'total_inventory' => 1,
        'max_guests' => 4,
        'adults_capacity' => 4,
        'children_capacity' => 2,
        'bed_configuration' => '1 King Bed + 2 Twin Beds',
        'size_sqm' => 80,
        'view' => 'Garden',
        'amenities' => ['Wi-Fi'],
        'featured_image' => ['src' => 'https://example.com/img.jpg', 'alt' => 'test', 'source' => 'https://example.com'],
        'gallery' => [],
        'is_active' => true,
    ]);

    $this->guest = Guest::create([
        'full_name' => 'Eduardo Manalo',
        'email' => 'eduardo@test.com',
        'phone' => '+639171234567',
    ]);

    $this->reservation = Reservation::create([
        'booking_reference' => 'GR-20261018-ED99',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => Carbon::tomorrow()->format('Y-m-d'),
        'check_out' => Carbon::tomorrow()->addDays(2)->format('Y-m-d'),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 2,
        'nightly_rate_php' => 12000.00,
        'total_price_php' => 24000.00,
        'currency' => 'PHP',
        'status' => 'pending',
        'guest_name_snapshot' => 'Eduardo Manalo',
        'guest_email_snapshot' => 'eduardo@test.com',
        'guest_phone_snapshot' => '+639171234567',
    ]);
});

test('admin can list reservations with search and filter', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson('/api/admin/reservations?search=ED99');

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.booking_reference', 'GR-20261018-ED99');
});

test('admin can view single reservation detail with financials', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson("/api/admin/reservations/{$this->reservation->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.booking_reference', 'GR-20261018-ED99')
        ->assertJsonPath('data.payment_status', 'unpaid')
        ->assertJsonPath('data.total_paid_php', 0);
});

test('admin can transition pending reservation to confirmed with staff notes', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->patchJson("/api/admin/reservations/{$this->reservation->id}/status", [
            'status' => 'confirmed',
            'notes' => 'Customer confirmed via telephone call.',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'confirmed');

    $this->reservation->refresh();
    expect($this->reservation->status)->toBe('confirmed');
    expect($this->reservation->special_requests)->toContain('Customer confirmed via telephone call.');
});

test('admin cannot confirm reservation if another booking took the single unit', function () {
    // Another guest took the single unit in confirmed state
    $otherGuest = Guest::create(['full_name' => 'Fast Booker', 'email' => 'fast@test.com', 'phone' => '+639178889999']);
    Reservation::create([
        'booking_reference' => 'GR-20261018-FAST',
        'room_id' => $this->room->id,
        'guest_id' => $otherGuest->id,
        'check_in' => $this->reservation->check_in,
        'check_out' => $this->reservation->check_out,
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 2,
        'nightly_rate_php' => 12000.00,
        'total_price_php' => 24000.00,
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'Fast Booker',
        'guest_email_snapshot' => 'fast@test.com',
        'guest_phone_snapshot' => '+639178889999',
    ]);

    // Admin attempts to also confirm the competing reservation
    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->patchJson("/api/admin/reservations/{$this->reservation->id}/status", [
            'status' => 'confirmed',
        ]);

    $response->assertStatus(409)
        ->assertJsonFragment(['message' => 'Cannot confirm reservation: accommodation inventory is already fully booked for these dates.']);
});

test('admin reservation show endpoint returns top level stay and pricing fields', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson("/api/admin/reservations/{$this->reservation->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.check_in', (string) $this->reservation->check_in->format('Y-m-d'))
        ->assertJsonPath('data.check_out', (string) $this->reservation->check_out->format('Y-m-d'))
        ->assertJsonPath('data.nights', 2)
        ->assertJsonPath('data.total_price_php', 24000)
        ->assertJsonPath('data.remaining_balance_php', 24000)
        ->assertJsonPath('data.pricing.total_price_php', 24000)
        ->assertJsonPath('data.stay.nights', 2);
});
