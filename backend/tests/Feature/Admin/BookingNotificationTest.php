<?php

use App\Models\BookingNotification;
use App\Models\Guest;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::create([
        'name' => 'Resort Admin',
        'email' => 'admin@test.com',
        'password' => Hash::make('password123'),
        'role' => 'admin',
    ]);
    $this->token = $this->admin->createToken('admin-token')->plainTextToken;

    $this->room = Room::create([
        'slug' => 'ocean-villa',
        'name' => 'Ocean Villa',
        'category' => 'villa',
        'tagline' => 'Luxury oceanfront villa',
        'description' => 'Direct sea view villa with private infinity plunge pool.',
        'long_description' => ['Full panoramic view of the sea.'],
        'nightly_rate_php' => 15000.00,
        'total_inventory' => 2,
        'max_guests' => 4,
        'adults_capacity' => 4,
        'children_capacity' => 2,
        'bed_configuration' => '1 King Bed + 1 Daybed',
        'size_sqm' => 95,
        'view' => 'Oceanfront',
        'amenities' => ['Private Pool', 'Wi-Fi', 'Breakfast'],
        'featured_image' => ['src' => 'https://example.com/villa.jpg', 'alt' => 'Ocean Villa', 'source' => 'https://example.com'],
        'gallery' => [],
        'is_active' => true,
    ]);

    $this->guest = Guest::create([
        'full_name' => 'Maria Santos',
        'email' => 'maria@example.com',
        'phone' => '+639178889999',
    ]);

    $this->reservation = Reservation::create([
        'booking_reference' => 'GR-20261020-MS01',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => Carbon::tomorrow()->format('Y-m-d'),
        'check_out' => Carbon::tomorrow()->addDays(2)->format('Y-m-d'),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 2,
        'nightly_rate_php' => 15000.00,
        'total_price_php' => 30000.00,
        'currency' => 'PHP',
        'status' => 'pending',
        'guest_name_snapshot' => 'Maria Santos',
        'guest_email_snapshot' => 'maria@example.com',
        'guest_phone_snapshot' => '+639178889999',
    ]);
});

test('public reservation creation automatically dispatches confirmation and staff alert', function () {
    Mail::fake();

    $response = $this->postJson('/api/v1/reservations', [
        'room_slug' => 'ocean-villa',
        'check_in' => Carbon::today()->addDays(5)->format('Y-m-d'),
        'check_out' => Carbon::today()->addDays(7)->format('Y-m-d'),
        'adults' => 2,
        'children' => 1,
        'guest_full_name' => 'Juan Dela Cruz',
        'guest_email' => 'juan@example.com',
        'guest_phone' => '+639181234567',
        'special_requests' => 'Late check-in requested',
    ]);

    $response->assertStatus(201);

    // Verify 2 notifications created: 1 for guest, 1 for staff
    $guestNotif = BookingNotification::where('recipient_email', 'juan@example.com')
        ->where('notification_type', 'booking_confirmation')
        ->first();
    expect($guestNotif)->not->toBeNull();
    expect($guestNotif->status)->toBe('sent');

    $staffNotif = BookingNotification::where('notification_type', 'internal_new_booking')->first();
    expect($staffNotif)->not->toBeNull();
    expect($staffNotif->recipient_type)->toBe('staff');
});

test('idempotency prevents duplicate notifications with identical key', function () {
    $service = app(NotificationService::class);

    $first = $service->sendBookingConfirmation($this->reservation);
    expect($first)->not->toBeNull();

    $second = $service->sendBookingConfirmation($this->reservation);
    expect($second->id)->toBe($first->id);

    $count = BookingNotification::where('reservation_id', $this->reservation->id)
        ->where('notification_type', 'booking_confirmation')
        ->count();
    expect($count)->toBe(1);
});

test('completing a payment triggers payment confirmation receipt', function () {
    $payment = Payment::create([
        'reservation_id' => $this->reservation->id,
        'payment_reference' => 'PAY-20261020-0001',
        'amount' => 10000.00,
        'currency' => 'PHP',
        'payment_method' => 'credit_card',
        'status' => 'pending',
        'recorded_by_user_id' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->patchJson("/api/admin/payments/{$payment->id}/status", [
            'status' => 'completed',
            'notes' => 'Verified card swipe',
        ]);

    $response->assertStatus(200);

    $notif = BookingNotification::where('payment_id', $payment->id)
        ->where('notification_type', 'payment_confirmation')
        ->first();

    expect($notif)->not->toBeNull();
    expect($notif->recipient_email)->toBe('maria@example.com');
    expect($notif->status)->toBe('sent');
});

test('cancelling a reservation triggers cancellation notice', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->patchJson("/api/admin/reservations/{$this->reservation->id}/status", [
            'status' => 'cancelled',
            'notes' => 'Guest requested cancellation by phone',
        ]);

    $response->assertStatus(200);

    $notif = BookingNotification::where('reservation_id', $this->reservation->id)
        ->where('notification_type', 'booking_cancellation')
        ->first();

    expect($notif)->not->toBeNull();
    expect($notif->status)->toBe('sent');
});

test('issuing a refund triggers refund update notification', function () {
    $payment = Payment::create([
        'reservation_id' => $this->reservation->id,
        'payment_reference' => 'PAY-20261020-0002',
        'amount' => 15000.00,
        'currency' => 'PHP',
        'payment_method' => 'credit_card',
        'status' => 'completed',
        'recorded_by_user_id' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson("/api/admin/payments/{$payment->id}/refunds", [
            'amount' => 5000.00,
            'reason' => 'Partial stay refund',
            'status' => 'completed',
        ]);

    $response->assertStatus(201);

    $notif = BookingNotification::where('reservation_id', $this->reservation->id)
        ->where('notification_type', 'refund_update')
        ->first();

    expect($notif)->not->toBeNull();
    expect($notif->status)->toBe('sent');
});

test('admin can list and filter notifications with metrics', function () {
    app(NotificationService::class)->sendBookingConfirmation($this->reservation);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson('/api/admin/notifications');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'recipient_email', 'notification_type', 'subject', 'status'],
            ],
            'metrics' => ['total', 'sent', 'queued', 'failed'],
            'meta' => ['current_page', 'total'],
        ]);
});

test('admin can view notifications for specific reservation', function () {
    app(NotificationService::class)->sendBookingConfirmation($this->reservation);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson("/api/admin/reservations/{$this->reservation->id}/notifications");

    $response->assertStatus(200)
        ->assertJsonPath('reservation_id', $this->reservation->id)
        ->assertJsonCount(1, 'data');
});

test('admin can manually trigger payment reminder on-demand', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson("/api/admin/reservations/{$this->reservation->id}/notifications/send", [
            'type' => 'payment_reminder',
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.notification_type', 'payment_reminder')
        ->assertJsonPath('data.status', 'sent');

    $this->assertDatabaseHas('booking_notifications', [
        'reservation_id' => $this->reservation->id,
        'notification_type' => 'payment_reminder',
        'status' => 'sent',
    ]);
});

test('admin can retry failed notification', function () {
    $failedNotif = BookingNotification::create([
        'reservation_id' => $this->reservation->id,
        'recipient_email' => 'maria@example.com',
        'recipient_type' => 'guest',
        'notification_type' => 'booking_confirmation',
        'channel' => 'mail',
        'subject' => 'Test Subject',
        'status' => 'failed',
        'idempotency_key' => 'failed_test_key_'.time(),
        'error_message' => 'Simulated network timeout',
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson("/api/admin/notifications/{$failedNotif->id}/retry");

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'sent');
});

test('scheduled commands execute successfully', function () {
    // 1. Check-in reminders
    $exitCode = $this->artisan('resort:send-check-in-reminders', [
        '--date' => Carbon::tomorrow()->toDateString(),
    ])->run();

    expect($exitCode)->toBe(0);

    // 2. Payment reminders
    $exitCode2 = $this->artisan('resort:send-payment-reminders', [
        '--days' => 5,
    ])->run();

    expect($exitCode2)->toBe(0);
});
