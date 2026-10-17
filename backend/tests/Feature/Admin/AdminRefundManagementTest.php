<?php

use App\Models\Guest;
use App\Models\Payment;
use App\Models\Refund;
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

    $this->staff = User::create([
        'name' => 'Regular User',
        'email' => 'user@test.com',
        'password' => Hash::make('password123'),
        'role' => 'user',
    ]);
    $this->userToken = $this->staff->createToken('user-token')->plainTextToken;

    $this->room = Room::create([
        'slug' => 'test-villa',
        'name' => 'Test Villa',
        'category' => 'villa',
        'tagline' => 'Test Villa',
        'description' => 'Test Villa',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 11800.00,
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
        'booking_reference' => 'GR-20261018-REF1',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => Carbon::tomorrow()->format('Y-m-d'),
        'check_out' => Carbon::tomorrow()->addDay()->format('Y-m-d'),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 1,
        'nightly_rate_php' => 11800.00,
        'total_price_php' => 11800.00,
        'currency' => 'PHP',
        'status' => 'confirmed',
        'guest_name_snapshot' => 'Paying Guest',
        'guest_email_snapshot' => 'payer@test.com',
        'guest_phone_snapshot' => '+639175556666',
    ]);

    $this->completedPayment = Payment::create([
        'reservation_id' => $this->reservation->id,
        'payment_reference' => 'PAY-20261018-TEST',
        'amount' => 5000.00,
        'currency' => 'PHP',
        'payment_method' => 'credit_card',
        'status' => 'completed',
        'recorded_by_user_id' => $this->admin->id,
    ]);
});

test('admin can issue a partial refund against a completed payment', function () {
    $payload = [
        'amount' => 2000.00,
        'reason' => 'Guest cancelled optional amenity package.',
        'notes' => 'Approved by hotel manager.',
    ];

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson("/api/admin/payments/{$this->completedPayment->id}/refunds", $payload);

    $response->assertStatus(201)
        ->assertJsonPath('data.amount', 2000)
        ->assertJsonPath('data.reason', 'Guest cancelled optional amenity package.')
        ->assertJsonPath('data.status', 'completed')
        ->assertJsonPath('payment.refunded_amount', 2000)
        ->assertJsonPath('payment.remaining_refundable', 3000)
        ->assertJsonPath('reservation_summary.gross_paid_php', 5000)
        ->assertJsonPath('reservation_summary.refunded_php', 2000)
        ->assertJsonPath('reservation_summary.net_paid_php', 3000)
        ->assertJsonPath('reservation_summary.remaining_balance_php', 8800)
        ->assertJsonPath('reservation_summary.payment_status', 'partially_paid');

    // Original payment remains completed with audit note appended
    $freshPayment = $this->completedPayment->fresh();
    expect($freshPayment->status)->toBe('completed');
    expect($freshPayment->notes)->toContain('Refund Issued: ₱2,000.00');

    // Net collections for reservation is 5000 - 2000 = 3000
    expect($this->reservation->fresh()->totalPaid())->toBe(3000.00);
});

test('admin can issue multiple partial refunds up to total payment amount', function () {
    // First refund: 2000
    $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson("/api/admin/payments/{$this->completedPayment->id}/refunds", [
            'amount' => 2000.00,
            'reason' => 'Partial refund 1',
        ])->assertStatus(201);

    // Second refund: 3000 (total = 5000)
    $response2 = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson("/api/admin/payments/{$this->completedPayment->id}/refunds", [
            'amount' => 3000.00,
            'reason' => 'Partial refund 2',
        ]);

    $response2->assertStatus(201)
        ->assertJsonPath('payment.refunded_amount', 5000)
        ->assertJsonPath('payment.remaining_refundable', 0);

    expect($this->reservation->fresh()->totalPaid())->toBe(0.00);
    expect($this->reservation->fresh()->paymentStatus())->toBe('unpaid');
});

test('refund exceeding remaining refundable balance is rejected', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson("/api/admin/payments/{$this->completedPayment->id}/refunds", [
            'amount' => 5001.00, // Payment is only 5000
            'reason' => 'Too high refund',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['amount']);
});

test('cannot refund a pending or failed payment', function () {
    $pendingPayment = Payment::create([
        'reservation_id' => $this->reservation->id,
        'payment_reference' => 'PAY-PENDING-REF',
        'amount' => 2000.00,
        'currency' => 'PHP',
        'payment_method' => 'cash',
        'status' => 'pending',
        'recorded_by_user_id' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson("/api/admin/payments/{$pendingPayment->id}/refunds", [
            'amount' => 1000.00,
            'reason' => 'Invalid attempt',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['payment']);
});

test('pending refund does not reduce net collections until completed', function () {
    // Create refund as pending
    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson("/api/admin/payments/{$this->completedPayment->id}/refunds", [
            'amount' => 2000.00,
            'reason' => 'Pending check return',
            'status' => 'pending',
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.status', 'pending');

    $refundId = $response->json('data.id');

    // Net collections remains 5000 while refund is pending
    $calc = app(\App\Services\FinancialCalculationService::class);
    expect($calc->grossCollections($this->reservation->id))->toBe(5000.00);
    expect($calc->completedRefunds($this->reservation->id))->toBe(0.00);
    expect($calc->netCollections($this->reservation->id))->toBe(5000.00);

    // Update refund to completed
    $updateResponse = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->patchJson("/api/admin/refunds/{$refundId}/status", [
            'status' => 'completed',
            'notes' => 'Confirmed cashier return.',
        ]);

    $updateResponse->assertStatus(200)
        ->assertJsonPath('data.status', 'completed');

    // Now net collections is reduced to 3000
    expect($calc->completedRefunds($this->reservation->id))->toBe(2000.00);
    expect($calc->netCollections($this->reservation->id))->toBe(3000.00);
});

test('unauthorized user cannot issue refund', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->userToken)
        ->postJson("/api/admin/payments/{$this->completedPayment->id}/refunds", [
            'amount' => 1000.00,
            'reason' => 'Unauthorized refund attempt',
        ]);

    $response->assertStatus(403);
});

test('admin can retrieve refunds for a payment and list all refunds', function () {
    Refund::create([
        'refund_reference' => 'REF-20261018-0001',
        'payment_id' => $this->completedPayment->id,
        'reservation_id' => $this->reservation->id,
        'amount' => 1000.00,
        'currency' => 'PHP',
        'reason' => 'Partial refund test',
        'status' => 'completed',
        'requested_by_user_id' => $this->admin->id,
    ]);

    // Payment specific refunds
    $res1 = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson("/api/admin/payments/{$this->completedPayment->id}/refunds");

    $res1->assertStatus(200)
        ->assertJsonPath('refunded_amount', 1000)
        ->assertJsonCount(1, 'data');

    // All refunds list
    $res2 = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson('/api/admin/refunds');

    $res2->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('summary.total_completed_refunds_php', 1000);
});

test('dashboard stats reconciles net collections, gross collections, and completed refunds', function () {
    Refund::create([
        'refund_reference' => 'REF-20261018-0002',
        'payment_id' => $this->completedPayment->id,
        'reservation_id' => $this->reservation->id,
        'amount' => 1500.00,
        'currency' => 'PHP',
        'reason' => 'Audit check',
        'status' => 'completed',
        'requested_by_user_id' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson('/api/admin/dashboard/stats');

    $response->assertStatus(200)
        ->assertJsonPath('metrics.financials.gross_collections_php', 5000)
        ->assertJsonPath('metrics.financials.completed_refunds_php', 1500)
        ->assertJsonPath('metrics.financials.net_collections_php', 3500)
        ->assertJsonPath('metrics.financials.verified_revenue_php', 3500);
});
