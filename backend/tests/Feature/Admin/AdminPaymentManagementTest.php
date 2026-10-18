<?php

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
        'name' => 'Admin User',
        'email' => 'admin@test.com',
        'password' => Hash::make('password123'),
        'role' => 'admin',
    ]);
    $this->token = $this->admin->createToken('admin-token')->plainTextToken;

    $this->room = Room::create([
        'slug' => 'test-villa',
        'name' => 'Test Villa',
        'category' => 'villa',
        'tagline' => 'Test Villa',
        'description' => 'Test Villa',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 20000.00,
        'total_inventory' => 1,
        'max_guests' => 4,
        'adults_capacity' => 4,
        'children_capacity' => 2,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 100,
        'view' => 'Sea',
        'amenities' => ['Pool'],
        'featured_image' => ['src' => 'https://example.com/img.jpg', 'alt' => 'test', 'source' => 'https://example.com'],
        'gallery' => [],
        'is_active' => true,
    ]);

    $this->guest = Guest::create(['full_name' => 'Paying Guest', 'email' => 'payer@test.com', 'phone' => '+639175556666']);

    $this->reservation = Reservation::create([
        'booking_reference' => 'GR-20261018-PAY1',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => Carbon::tomorrow()->format('Y-m-d'),
        'check_out' => Carbon::tomorrow()->addDay()->format('Y-m-d'),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 1,
        'nightly_rate_php' => 20000.00,
        'total_price_php' => 20000.00,
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'Paying Guest',
        'guest_email_snapshot' => 'payer@test.com',
        'guest_phone_snapshot' => '+639175556666',
    ]);
});

test('admin can record manual payment against a reservation and status defaults to pending', function () {
    $payload = [
        'reservation_id' => $this->reservation->id,
        'amount' => 20000.00,
        'payment_method' => 'bank_transfer',
        'status' => 'completed', // Client attempts to supply completed
        'notes' => 'BDO Transfer reference #99281729',
    ];

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson('/api/admin/payments', $payload);

    $response->assertStatus(201)
        ->assertJsonPath('data.amount', 20000)
        ->assertJsonPath('data.payment_method', 'bank_transfer')
        ->assertJsonPath('data.status', 'pending'); // Server strictly enforces pending

    // Pending payment must not count as paid or verified revenue yet
    expect($this->reservation->fresh()->paymentStatus())->toBe('unpaid');
    expect($this->reservation->fresh()->totalPaid())->toBe(0.00);
});

test('admin can update payment status from pending to completed', function () {
    $createResponse = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson('/api/admin/payments', [
            'reservation_id' => $this->reservation->id,
            'amount' => 20000.00,
            'payment_method' => 'bank_transfer',
            'notes' => 'Awaiting bank clearance',
        ])->assertStatus(201);

    $paymentId = $createResponse->json('data.id');

    // Update status to completed with audit note
    $updateResponse = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->patchJson("/api/admin/payments/{$paymentId}/status", [
            'status' => 'completed',
            'notes' => 'Verified with BDO online banking.',
        ]);

    $updateResponse->assertStatus(200)
        ->assertJsonPath('data.status', 'completed')
        ->assertJsonPath('summary.total_completed_php', 20000);

    // Reservation is now fully paid and verified revenue reflects the payment
    expect($this->reservation->fresh()->paymentStatus())->toBe('paid');
    expect($this->reservation->fresh()->totalPaid())->toBe(20000.00);
});

test('admin can update payment status to cancelled or failed', function () {
    $payment = Payment::create([
        'reservation_id' => $this->reservation->id,
        'payment_reference' => 'PAY-TEST-REF1',
        'amount' => 5000.00,
        'currency' => 'PHP',
        'payment_method' => 'cash',
        'status' => 'pending',
        'recorded_by_user_id' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->patchJson("/api/admin/payments/{$payment->id}/status", [
            'status' => 'cancelled',
            'notes' => 'Guest cancelled payment method.',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'cancelled');

    // Cancelled payment is excluded from totalPaid and revenue
    expect($this->reservation->fresh()->totalPaid())->toBe(0.00);
});

test('updating payment status rejects invalid status', function () {
    $payment = Payment::create([
        'reservation_id' => $this->reservation->id,
        'payment_reference' => 'PAY-TEST-REF2',
        'amount' => 5000.00,
        'currency' => 'PHP',
        'payment_method' => 'cash',
        'status' => 'pending',
        'recorded_by_user_id' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->patchJson("/api/admin/payments/{$payment->id}/status", [
            'status' => 'invalid_status_value',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['status']);
});

test('unauthorized user cannot update payment status', function () {
    $payment = Payment::create([
        'reservation_id' => $this->reservation->id,
        'payment_reference' => 'PAY-TEST-REF3',
        'amount' => 5000.00,
        'currency' => 'PHP',
        'payment_method' => 'cash',
        'status' => 'pending',
        'recorded_by_user_id' => $this->admin->id,
    ]);

    $response = $this->patchJson("/api/admin/payments/{$payment->id}/status", [
        'status' => 'completed',
    ]);

    $response->assertStatus(401);
});

test('admin can list payments and view total revenue summary strictly from completed payments', function () {
    // 1 pending payment
    $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson('/api/admin/payments', [
            'reservation_id' => $this->reservation->id,
            'amount' => 5000.00,
            'payment_method' => 'cash',
            'notes' => 'Pending check',
        ])->assertStatus(201);

    // 1 completed payment created directly
    Payment::create([
        'reservation_id' => $this->reservation->id,
        'payment_reference' => 'PAY-TEST-COMP',
        'amount' => 10000.00,
        'currency' => 'PHP',
        'payment_method' => 'cash',
        'status' => 'completed',
        'recorded_by_user_id' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson('/api/admin/payments');

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('summary.total_completed_php', 10000); // Excludes the 5000 pending payment!
});

test('admin cannot overpay beyond remaining balance when creating payment', function () {
    $payload = [
        'reservation_id' => $this->reservation->id,
        'amount' => 25000.00, // Total reservation price is 20000
        'payment_method' => 'credit_card',
        'notes' => 'Attempting overpayment',
    ];

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson('/api/admin/payments', $payload);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['amount']);
});

test('admin can record payment with credit_card or e_wallet methods', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson('/api/admin/payments', [
            'reservation_id' => $this->reservation->id,
            'amount' => 5000.00,
            'payment_method' => 'credit_card',
            'notes' => 'POS credit card swipe',
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.payment_method', 'credit_card')
        ->assertJsonPath('data.status', 'pending');

    $response2 = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson('/api/admin/payments', [
            'reservation_id' => $this->reservation->id,
            'amount' => 5000.00,
            'payment_method' => 'e_wallet',
            'notes' => 'GCash payment receipt #12345',
        ]);

    $response2->assertStatus(201)
        ->assertJsonPath('data.payment_method', 'e_wallet')
        ->assertJsonPath('data.status', 'pending');
});
