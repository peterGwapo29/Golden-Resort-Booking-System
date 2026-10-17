<?php

use App\Models\Guest;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::create([
        'name' => 'Security Admin',
        'email' => 'sec_admin@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'admin',
    ]);
    $this->adminToken = $this->admin->createToken('admin-token')->plainTextToken;

    $this->staff = User::create([
        'name' => 'Security Staff',
        'email' => 'sec_staff@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'staff',
    ]);
    $this->staffToken = $this->staff->createToken('staff-token')->plainTextToken;

    $this->room = Room::create([
        'slug' => 'security-suite',
        'name' => 'Security Suite',
        'category' => 'suite',
        'tagline' => 'Hardened secure suite',
        'description' => 'Test room',
        'long_description' => ['Test description'],
        'nightly_rate_php' => 10000.00,
        'total_inventory' => 5,
        'max_guests' => 2,
        'adults_capacity' => 2,
        'children_capacity' => 0,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 60,
        'view' => 'Garden',
        'amenities' => ['Wi-Fi'],
        'featured_image' => ['src' => 'https://images.unsplash.com/photo-1611892440504-42a792e24d32'],
        'gallery' => [],
        'is_active' => true,
    ]);

    $this->guest = Guest::create([
        'full_name' => 'Alice Security',
        'email' => 'alice@example.com',
        'phone' => '+639171234567',
    ]);

    $this->reservation = Reservation::create([
        'booking_reference' => 'GR-20261018-SECU',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => '2026-11-01',
        'check_out' => '2026-11-03',
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 2,
        'nightly_rate_php' => 10000.00,
        'total_price_php' => 20000.00,
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'Alice Security',
        'guest_email_snapshot' => 'alice@example.com',
        'guest_phone_snapshot' => '+639171234567',
    ]);
});

test('public reservation endpoint applies rate limiting', function () {
    $payload = [
        'room_slug' => $this->room->slug,
        'check_in' => '2026-12-01',
        'check_out' => '2026-12-02',
        'adults' => 1,
        'guest_full_name' => 'Burst Tester',
        'guest_email' => 'burst@example.com',
        'guest_phone' => '+639170000000',
    ];

    // Send 10 rapid requests (allowed limit)
    for ($i = 0; $i < 10; $i++) {
        $response = $this->postJson('/api/reservations', $payload);
        // Either 201 (success) or 409 (inventory exhausted) is acceptable under the rate limiter
        expect($response->status())->not->toBe(429);
    }

    // 11th request must be throttled
    $throttledResponse = $this->postJson('/api/reservations', $payload);
    $throttledResponse->assertStatus(429);
});

test('unauthenticated users cannot access administrative endpoints', function () {
    $response = $this->getJson('/api/admin/payments');
    $response->assertStatus(401);
});

test('non-admin users cannot access administrative endpoints', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->staffToken)
        ->getJson('/api/admin/payments');
    $response->assertStatus(403);
});

test('payment cannot be arbitrarily altered when completed refunds exist', function () {
    $payment = Payment::create([
        'reservation_id' => $this->reservation->id,
        'payment_reference' => 'PAY-SEC-001',
        'amount' => 10000.00,
        'currency' => 'PHP',
        'payment_method' => 'cash',
        'status' => 'partially_refunded',
        'recorded_by_user_id' => $this->admin->id,
    ]);

    Refund::create([
        'refund_reference' => 'REF-SEC-001',
        'payment_id' => $payment->id,
        'reservation_id' => $this->reservation->id,
        'amount' => 2000.00,
        'currency' => 'PHP',
        'reason' => 'Guest complaint resolved',
        'status' => 'completed',
        'requested_by_user_id' => $this->admin->id,
        'approved_by_user_id' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->patchJson("/api/admin/payments/{$payment->id}/status", [
            'status' => 'pending',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['status']);
});

test('failed payment cannot be directly marked as refunded', function () {
    $payment = Payment::create([
        'reservation_id' => $this->reservation->id,
        'payment_reference' => 'PAY-SEC-002',
        'amount' => 5000.00,
        'currency' => 'PHP',
        'payment_method' => 'gcash',
        'status' => 'failed',
        'recorded_by_user_id' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->patchJson("/api/admin/payments/{$payment->id}/status", [
            'status' => 'refunded',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['status']);
});

test('completed refund cannot be reversed back to pending', function () {
    $payment = Payment::create([
        'reservation_id' => $this->reservation->id,
        'payment_reference' => 'PAY-SEC-003',
        'amount' => 10000.00,
        'currency' => 'PHP',
        'payment_method' => 'bank_transfer',
        'status' => 'completed',
        'recorded_by_user_id' => $this->admin->id,
    ]);

    $refund = Refund::create([
        'refund_reference' => 'REF-SEC-002',
        'payment_id' => $payment->id,
        'reservation_id' => $this->reservation->id,
        'amount' => 5000.00,
        'currency' => 'PHP',
        'reason' => 'Duplicate transfer refund',
        'status' => 'completed',
        'requested_by_user_id' => $this->admin->id,
        'approved_by_user_id' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->patchJson("/api/admin/refunds/{$refund->id}/status", [
            'status' => 'pending',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['status']);
});

test('security audit logger captures admin actions without recording secrets', function () {
    Log::shouldReceive('info')
        ->atLeast()->once()
        ->withArgs(function ($message, $context) {
            expect($message)->toContain('[SECURITY_AUDIT]')
                ->and($context)->toBeArray()
                ->and(isset($context['timestamp']))->toBeTrue();

            // Verify secrets are redacted if present
            if (isset($context['context']['password'])) {
                expect($context['context']['password'])->toBe('***REDACTED***');
            }

            return true;
        });

    $this->postJson('/api/admin/login', [
        'email' => 'sec_admin@goldenresort.com',
        'password' => 'wrongpassword',
    ]);
});
