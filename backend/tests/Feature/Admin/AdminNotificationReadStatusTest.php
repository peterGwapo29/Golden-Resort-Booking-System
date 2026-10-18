<?php

use App\Models\BookingNotification;
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
        'name' => 'Resort Admin',
        'email' => 'admin@test.com',
        'password' => Hash::make('password123'),
        'role' => 'admin',
    ]);
    $this->token = $this->admin->createToken('admin-token')->plainTextToken;

    $this->room = Room::create([
        'slug' => 'sunset-suite',
        'name' => 'Sunset Suite',
        'category' => 'suite',
        'tagline' => 'Sunset view suite',
        'description' => 'Beautiful sea view.',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 8000.00,
        'total_inventory' => 5,
        'max_guests' => 3,
        'adults_capacity' => 2,
        'children_capacity' => 1,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 60,
        'view' => 'Sunset View',
        'amenities' => ['Wi-Fi'],
        'featured_image' => ['src' => 'https://example.com/img.jpg', 'alt' => 'test', 'source' => 'https://example.com'],
        'gallery' => [],
        'is_active' => true,
    ]);

    $this->guest = Guest::create([
        'full_name' => 'Carla Reyes',
        'email' => 'carla@example.com',
        'phone' => '+639171112222',
    ]);

    $this->reservation = Reservation::create([
        'booking_reference' => 'GR-20261025-CR01',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => Carbon::tomorrow()->format('Y-m-d'),
        'check_out' => Carbon::tomorrow()->addDays(2)->format('Y-m-d'),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 2,
        'nightly_rate_php' => 8000.00,
        'total_price_php' => 16000.00,
        'currency' => 'PHP',
        'status' => 'pending',
        'guest_name_snapshot' => 'Carla Reyes',
        'guest_email_snapshot' => 'carla@example.com',
        'guest_phone_snapshot' => '+639171112222',
    ]);
});

test('returns zero unread count when no notifications exist', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson('/api/admin/notifications/unread-count');

    $response->assertStatus(200)
        ->assertJson(['unread_count' => 0]);
});

test('admin can fetch accurate unread notification count', function () {
    // Create 3 unread notifications
    BookingNotification::create([
        'reservation_id' => $this->reservation->id,
        'recipient_email' => 'carla@example.com',
        'recipient_type' => 'guest',
        'notification_type' => 'booking_confirmation',
        'channel' => 'mail',
        'subject' => 'Confirmation 1',
        'status' => 'sent',
        'idempotency_key' => 'test_key_1',
    ]);

    BookingNotification::create([
        'reservation_id' => $this->reservation->id,
        'recipient_email' => 'admin@test.com',
        'recipient_type' => 'staff',
        'notification_type' => 'internal_new_booking',
        'channel' => 'mail',
        'subject' => 'Staff Alert 1',
        'status' => 'sent',
        'idempotency_key' => 'test_key_2',
    ]);

    BookingNotification::create([
        'reservation_id' => $this->reservation->id,
        'recipient_email' => 'carla@example.com',
        'recipient_type' => 'guest',
        'notification_type' => 'payment_reminder',
        'channel' => 'mail',
        'subject' => 'Reminder 1',
        'status' => 'sent',
        'idempotency_key' => 'test_key_3',
        'read_at' => Carbon::now(), // 1 is already read
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson('/api/admin/notifications/unread-count');

    $response->assertStatus(200)
        ->assertJson(['unread_count' => 2]);
});

test('handles high unread counts over 99 gracefully', function () {
    $records = [];
    for ($i = 1; $i <= 105; $i++) {
        $records[] = [
            'reservation_id' => $this->reservation->id,
            'recipient_email' => "guest{$i}@example.com",
            'recipient_type' => 'guest',
            'notification_type' => 'booking_confirmation',
            'channel' => 'mail',
            'subject' => "Notification {$i}",
            'status' => 'sent',
            'idempotency_key' => "bulk_key_{$i}",
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
    BookingNotification::insert($records);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson('/api/admin/notifications/unread-count');

    $response->assertStatus(200)
        ->assertJson(['unread_count' => 105]);
});

test('admin can mark single notification as read and unread', function () {
    $notif = BookingNotification::create([
        'reservation_id' => $this->reservation->id,
        'recipient_email' => 'carla@example.com',
        'recipient_type' => 'guest',
        'notification_type' => 'booking_confirmation',
        'channel' => 'mail',
        'subject' => 'Confirmation Test',
        'status' => 'sent',
        'idempotency_key' => 'test_key_mark',
        'read_at' => null,
    ]);

    // Mark as read
    $readResponse = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->patchJson("/api/admin/notifications/{$notif->id}/read");

    $readResponse->assertStatus(200)
        ->assertJsonPath('data.is_read', true)
        ->assertJsonPath('unread_count', 0);

    expect($notif->fresh()->read_at)->not->toBeNull();

    // Mark as unread
    $unreadResponse = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->patchJson("/api/admin/notifications/{$notif->id}/unread");

    $unreadResponse->assertStatus(200)
        ->assertJsonPath('data.is_read', false)
        ->assertJsonPath('unread_count', 1);

    expect($notif->fresh()->read_at)->toBeNull();
});

test('admin can mark all notifications as read in bulk', function () {
    BookingNotification::create([
        'reservation_id' => $this->reservation->id,
        'recipient_email' => 'carla@example.com',
        'recipient_type' => 'guest',
        'notification_type' => 'booking_confirmation',
        'channel' => 'mail',
        'subject' => 'Conf 1',
        'status' => 'sent',
        'idempotency_key' => 'bulk_1',
        'read_at' => null,
    ]);

    BookingNotification::create([
        'reservation_id' => $this->reservation->id,
        'recipient_email' => 'admin@test.com',
        'recipient_type' => 'staff',
        'notification_type' => 'internal_new_booking',
        'channel' => 'mail',
        'subject' => 'Alert 1',
        'status' => 'sent',
        'idempotency_key' => 'bulk_2',
        'read_at' => null,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->postJson('/api/admin/notifications/mark-all-read');

    $response->assertStatus(200)
        ->assertJson([
            'message' => 'All notifications marked as read.',
            'affected' => 2,
            'unread_count' => 0,
        ]);

    expect(BookingNotification::whereNull('read_at')->count())->toBe(0);
});

test('unauthenticated request cannot fetch unread count', function () {
    $response = $this->getJson('/api/admin/notifications/unread-count');
    $response->assertStatus(401);
});

test('non-admin user is forbidden from unread notifications endpoint', function () {
    $guestUser = User::create([
        'name' => 'Regular User',
        'email' => 'user@test.com',
        'password' => Hash::make('password123'),
        'role' => 'user',
    ]);
    $guestToken = $guestUser->createToken('user-token')->plainTextToken;

    $response = $this->withHeader('Authorization', 'Bearer '.$guestToken)
        ->getJson('/api/admin/notifications/unread-count');

    $response->assertStatus(403);
});

test('admin can filter notifications by read_status', function () {
    BookingNotification::create([
        'reservation_id' => $this->reservation->id,
        'recipient_email' => 'carla@example.com',
        'recipient_type' => 'guest',
        'notification_type' => 'booking_confirmation',
        'channel' => 'mail',
        'subject' => 'Unread Notice',
        'status' => 'sent',
        'idempotency_key' => 'unread_notice_key',
        'read_at' => null,
    ]);

    BookingNotification::create([
        'reservation_id' => $this->reservation->id,
        'recipient_email' => 'carla@example.com',
        'recipient_type' => 'guest',
        'notification_type' => 'payment_confirmation',
        'channel' => 'mail',
        'subject' => 'Read Notice',
        'status' => 'sent',
        'idempotency_key' => 'read_notice_key',
        'read_at' => Carbon::now(),
    ]);

    // Filter unread only
    $unreadRes = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson('/api/admin/notifications?read_status=unread');

    $unreadRes->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.subject', 'Unread Notice')
        ->assertJsonPath('data.0.is_read', false);

    // Filter read only
    $readRes = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->getJson('/api/admin/notifications?read_status=read');

    $readRes->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.subject', 'Read Notice')
        ->assertJsonPath('data.0.is_read', true);
});

test('repeated calls to mark as read are idempotent and preserve delivery status', function () {
    $notif = BookingNotification::create([
        'reservation_id' => $this->reservation->id,
        'recipient_email' => 'carla@example.com',
        'recipient_type' => 'guest',
        'notification_type' => 'booking_confirmation',
        'channel' => 'mail',
        'subject' => 'Idempotency Test',
        'status' => 'sent',
        'idempotency_key' => 'idempotent_test_key',
        'read_at' => null,
    ]);

    // First call: marks as read
    $firstResponse = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->patchJson("/api/admin/notifications/{$notif->id}/read");

    $firstResponse->assertStatus(200)
        ->assertJsonPath('data.is_read', true)
        ->assertJsonPath('unread_count', 0);

    $originalReadAt = $notif->fresh()->read_at;
    expect($originalReadAt)->not->toBeNull();
    expect($notif->fresh()->status)->toBe('sent');

    // Second call: idempotent, does not change delivery status, does not crash
    $secondResponse = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->patchJson("/api/admin/notifications/{$notif->id}/read");

    $secondResponse->assertStatus(200)
        ->assertJsonPath('data.is_read', true)
        ->assertJsonPath('unread_count', 0);

    $freshNotif = $notif->fresh();
    expect($freshNotif->status)->toBe('sent');
    expect($freshNotif->read_at->toIso8601String())->toBe($originalReadAt->toIso8601String());
});
