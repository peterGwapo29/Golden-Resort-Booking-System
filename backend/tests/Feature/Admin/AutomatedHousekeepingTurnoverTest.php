<?php

use App\Models\Guest;
use App\Models\HousekeepingTask;
use App\Models\HousekeepingTaskHistory;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->frontDesk = User::create([
        'name' => 'Front Desk Joy',
        'email' => 'joy@goldenresort.test',
        'password' => Hash::make('password123'),
        'role' => 'front_desk',
        'is_active' => true,
    ]);
    $this->frontDeskToken = $this->frontDesk->createToken('fd-token')->plainTextToken;

    $this->housekeeper = User::create([
        'name' => 'Housekeeper Maria',
        'email' => 'maria@goldenresort.test',
        'password' => Hash::make('password123'),
        'role' => 'housekeeper',
        'is_active' => true,
    ]);
    $this->housekeeperToken = $this->housekeeper->createToken('hk-token')->plainTextToken;

    $this->admin = User::create([
        'name' => 'Admin Boss',
        'email' => 'admin@goldenresort.test',
        'password' => Hash::make('password123'),
        'role' => 'admin',
        'is_active' => true,
    ]);
    $this->adminToken = $this->admin->createToken('admin-token')->plainTextToken;

    $this->room = Room::create([
        'slug' => 'ocean-suite',
        'name' => 'Ocean Suite 101',
        'category' => 'suite',
        'tagline' => 'Ocean views',
        'description' => 'Beautiful suite',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 8000.00,
        'total_inventory' => 1,
        'max_guests' => 4,
        'adults_capacity' => 4,
        'children_capacity' => 2,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 60,
        'view' => 'Ocean',
        'amenities' => ['Wi-Fi'],
        'featured_image' => ['src' => '/images/suite.jpg', 'alt' => 'test', 'source' => '/images/suite.jpg'],
        'gallery' => [],
        'is_active' => true,
        'housekeeping_status' => 'inspected',
    ]);

    $this->guest = Guest::create([
        'full_name' => 'Jose Rizal',
        'email' => 'jose@example.ph',
        'phone' => '+639171234567',
    ]);
});

test('successful checkout marks room dirty and generates pending cleaning task with audit history', function () {
    $reservation = Reservation::create([
        'booking_reference' => 'GR-TURNOVER-01',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => Carbon::yesterday()->toDateString(),
        'check_out' => Carbon::today()->toDateString(),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 1,
        'nightly_rate_php' => 8000.00,
        'total_price_php' => 8000.00,
        'currency' => 'PHP',
        'status' => 'checked_in',
        'checked_in_at' => Carbon::yesterday()->setHour(14),
        'guest_name_snapshot' => 'Jose Rizal',
        'guest_email_snapshot' => 'jose@example.ph',
        'guest_phone_snapshot' => '+639171234567',
    ]);

    // Record full payment so balance is 0
    Payment::create([
        'payment_reference' => 'PAY-TURN-001',
        'reservation_id' => $reservation->id,
        'amount' => 8000.00,
        'currency' => 'PHP',
        'payment_method' => 'cash',
        'status' => 'completed',
        'recorded_by_user_id' => $this->frontDesk->id,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->frontDeskToken)
        ->postJson("/api/admin/check-in-out/{$reservation->id}/check-out", [
            'notes' => 'Guest departed on time, keys returned.',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('reservation.status', 'completed')
        ->assertJsonPath('reservation.room_housekeeping_status', 'dirty');

    // 1. Verify room condition
    $freshRoom = $this->room->fresh();
    expect($freshRoom->housekeeping_status)->toBe('dirty');
    expect($freshRoom->housekeeping_notes)->toContain('GR-TURNOVER-01');

    // 2. Verify task creation
    $task = HousekeepingTask::where('room_id', $this->room->id)->latest('id')->first();
    expect($task)->not->toBeNull();
    expect($task->task_type)->toBe('cleaning');
    expect($task->priority)->toBe('high');
    expect($task->status)->toBe('pending');
    expect($task->created_by_user_id)->toBe($this->frontDesk->id);
    expect($task->assigned_to_user_id)->toBeNull();
    expect($task->notes)->toContain('GR-TURNOVER-01');

    // 3. Verify history entry
    $history = HousekeepingTaskHistory::where('housekeeping_task_id', $task->id)->first();
    expect($history)->not->toBeNull();
    expect($history->actor_user_id)->toBe($this->frontDesk->id);
    expect($history->action)->toBe('created');
    expect($history->to_status)->toBe('pending');
    expect($history->notes)->toContain('GR-TURNOVER-01');
});

test('checkout does not duplicate active task if room already has an active cleaning task', function () {
    // Existing active task already on the room
    $existingTask = HousekeepingTask::create([
        'room_id' => $this->room->id,
        'created_by_user_id' => $this->admin->id,
        'task_type' => 'cleaning',
        'priority' => 'normal',
        'status' => 'in_progress',
        'notes' => 'Housekeeper currently preparing room.',
        'scheduled_date' => Carbon::today()->toDateString(),
    ]);

    $reservation = Reservation::create([
        'booking_reference' => 'GR-TURNOVER-NODUP',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => Carbon::yesterday()->toDateString(),
        'check_out' => Carbon::today()->toDateString(),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 1,
        'nightly_rate_php' => 8000.00,
        'total_price_php' => 8000.00,
        'currency' => 'PHP',
        'status' => 'checked_in',
        'guest_name_snapshot' => 'Jose Rizal',
        'guest_email_snapshot' => 'jose@example.ph',
        'guest_phone_snapshot' => '+639171234567',
    ]);

    Payment::create([
        'payment_reference' => 'PAY-NODUP-001',
        'reservation_id' => $reservation->id,
        'amount' => 8000.00,
        'currency' => 'PHP',
        'payment_method' => 'cash',
        'status' => 'completed',
        'recorded_by_user_id' => $this->frontDesk->id,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->frontDeskToken)
        ->postJson("/api/admin/check-in-out/{$reservation->id}/check-out");

    $response->assertStatus(200);

    // Total tasks for room must remain exactly 1 (no duplicate spawned)
    $tasksCount = HousekeepingTask::where('room_id', $this->room->id)->count();
    expect($tasksCount)->toBe(1);

    // Existing task must be updated with checkout notes and priority escalated to high
    $freshTask = $existingTask->fresh();
    expect($freshTask->priority)->toBe('high');
    expect($freshTask->notes)->toContain('GR-TURNOVER-NODUP');

    // History log must record the turnover update
    $history = HousekeepingTaskHistory::where('housekeeping_task_id', $existingTask->id)
        ->where('action', 'checkout_turnover')
        ->first();
    expect($history)->not->toBeNull();
    expect($history->actor_user_id)->toBe($this->frontDesk->id);
    expect($history->notes)->toContain('GR-TURNOVER-NODUP');
});

test('checkout preserves room maintenance status if room is currently under maintenance', function () {
    // Room was placed under maintenance condition before checkout
    $this->room->housekeeping_status = 'maintenance';
    $this->room->housekeeping_notes = 'Under AC unit compressor replacement.';
    $this->room->save();

    $reservation = Reservation::create([
        'booking_reference' => 'GR-TURNOVER-MNT',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => Carbon::yesterday()->toDateString(),
        'check_out' => Carbon::today()->toDateString(),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 1,
        'nightly_rate_php' => 8000.00,
        'total_price_php' => 8000.00,
        'currency' => 'PHP',
        'status' => 'checked_in',
        'guest_name_snapshot' => 'Jose Rizal',
        'guest_email_snapshot' => 'jose@example.ph',
        'guest_phone_snapshot' => '+639171234567',
    ]);

    Payment::create([
        'payment_reference' => 'PAY-MNT-001',
        'reservation_id' => $reservation->id,
        'amount' => 8000.00,
        'currency' => 'PHP',
        'payment_method' => 'cash',
        'status' => 'completed',
        'recorded_by_user_id' => $this->frontDesk->id,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->frontDeskToken)
        ->postJson("/api/admin/check-in-out/{$reservation->id}/check-out");

    $response->assertStatus(200);

    // Room must retain 'maintenance' condition and NOT be overwritten to 'dirty'
    $freshRoom = $this->room->fresh();
    expect($freshRoom->housekeeping_status)->toBe('maintenance');
    expect($freshRoom->housekeeping_notes)->toContain('GR-TURNOVER-MNT');
    expect($freshRoom->housekeeping_notes)->toContain('remains under maintenance');
});

test('duplicate checkout request on already completed reservation is rejected with 422', function () {
    $reservation = Reservation::create([
        'booking_reference' => 'GR-ALREADY-OUT',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => Carbon::yesterday()->toDateString(),
        'check_out' => Carbon::today()->toDateString(),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 1,
        'nightly_rate_php' => 8000.00,
        'total_price_php' => 8000.00,
        'currency' => 'PHP',
        'status' => 'completed', // Already completed
        'checked_out_at' => Carbon::now()->subHour(),
        'guest_name_snapshot' => 'Jose Rizal',
        'guest_email_snapshot' => 'jose@example.ph',
        'guest_phone_snapshot' => '+639171234567',
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->frontDeskToken)
        ->postJson("/api/admin/check-in-out/{$reservation->id}/check-out");

    $response->assertStatus(422)
        ->assertJsonFragment(['message' => 'Only currently checked-in reservations can be checked out.']);

    // Zero housekeeping tasks created
    expect(HousekeepingTask::where('room_id', $this->room->id)->count())->toBe(0);
});

test('housekeeping management can query the turnover tasks with eager loaded history', function () {
    $reservation = Reservation::create([
        'booking_reference' => 'GR-HK-LIST-TEST',
        'room_id' => $this->room->id,
        'guest_id' => $this->guest->id,
        'check_in' => Carbon::yesterday()->toDateString(),
        'check_out' => Carbon::today()->toDateString(),
        'adults' => 2,
        'children' => 0,
        'total_guests' => 2,
        'nights' => 1,
        'nightly_rate_php' => 8000.00,
        'total_price_php' => 8000.00,
        'currency' => 'PHP',
        'status' => 'checked_in',
        'guest_name_snapshot' => 'Jose Rizal',
        'guest_email_snapshot' => 'jose@example.ph',
        'guest_phone_snapshot' => '+639171234567',
    ]);

    Payment::create([
        'payment_reference' => 'PAY-HK-001',
        'reservation_id' => $reservation->id,
        'amount' => 8000.00,
        'currency' => 'PHP',
        'payment_method' => 'cash',
        'status' => 'completed',
        'recorded_by_user_id' => $this->frontDesk->id,
    ]);

    $this->withHeader('Authorization', 'Bearer '.$this->frontDeskToken)
        ->postJson("/api/admin/check-in-out/{$reservation->id}/check-out");

    // Admin views tasks board
    \Laravel\Sanctum\Sanctum::actingAs($this->admin);
    $res = $this->getJson('/api/admin/housekeeping/tasks?room_id='.$this->room->id);

    $res->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.task_type', 'cleaning')
        ->assertJsonPath('data.0.priority', 'high')
        ->assertJsonPath('data.0.history.0.action', 'created')
        ->assertJsonPath('data.0.history.0.actor.name', 'Front Desk Joy');
});
