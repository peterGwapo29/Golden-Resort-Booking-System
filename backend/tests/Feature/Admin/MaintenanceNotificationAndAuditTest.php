<?php

use App\Mail\MaintenanceReviewDecisionMail;
use App\Mail\MaintenanceReviewSubmittedMail;
use App\Mail\MaintenanceTaskAssignedMail;
use App\Mail\MaintenanceTaskProgressAlertMail;
use App\Models\BookingNotification;
use App\Models\MaintenanceRequest;
use App\Models\MaintenanceRequestHistory;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
    Mail::fake();

    $this->admin = User::create([
        'name' => 'General Manager',
        'email' => 'admin@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'admin',
    ]);
    $this->adminToken = $this->admin->createToken('admin-token')->plainTextToken;

    $this->tech1 = User::create([
        'name' => 'Mario Electrician',
        'email' => 'mario@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'maintenance',
        'department' => 'Engineering',
    ]);
    $this->tech1Token = $this->tech1->createToken('tech1-token')->plainTextToken;

    $this->tech2 = User::create([
        'name' => 'Luigi Plumber',
        'email' => 'luigi@goldenresort.com',
        'password' => Hash::make('password123'),
        'role' => 'maintenance',
        'department' => 'Engineering',
    ]);
    $this->tech2Token = $this->tech2->createToken('tech2-token')->plainTextToken;

    $this->room = Room::create([
        'slug' => 'suite-101',
        'name' => 'Suite 101',
        'category' => 'suite',
        'tagline' => 'Executive Suite',
        'description' => 'Comfortable suite',
        'long_description' => ['Spacious suite.'],
        'nightly_rate_php' => 8500.00,
        'total_inventory' => 1,
        'max_guests' => 3,
        'adults_capacity' => 2,
        'children_capacity' => 1,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 50,
        'view' => 'Ocean',
        'amenities' => ['AC', 'Wi-Fi'],
        'featured_image' => ['src' => '/images/suite.jpg', 'alt' => 'Suite 101', 'source' => '/images/suite.jpg'],
        'gallery' => [],
        'is_active' => true,
    ]);
});

test('dispatches notification to technician upon task assignment and logs audit with changes_payload', function () {
    $maintenance = MaintenanceRequest::create([
        'title' => 'Faulty AC Unit',
        'description' => 'AC blowing warm air.',
        'resource_type' => 'room',
        'room_id' => $this->room->id,
        'resource_name' => $this->room->name,
        'priority' => 'high',
        'status' => 'reported',
        'reported_by_user_id' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
        ->postJson("/api/admin/maintenance/{$maintenance->id}/assign", [
            'assigned_to_user_id' => $this->tech1->id,
            'notes' => 'Please inspect coils.',
        ]);

    $response->assertStatus(200);

    // Verify email sent
    Mail::assertQueued(MaintenanceTaskAssignedMail::class, function ($mail) {
        return $mail->hasTo('mario@goldenresort.com') &&
               $mail->assignee->id === $this->tech1->id &&
               $mail->isReassignment === false;
    });

    // Verify BookingNotification record created
    $notification = BookingNotification::where('maintenance_request_id', $maintenance->id)
        ->where('notification_type', 'maintenance_task_assigned')
        ->first();

    expect($notification)->not->toBeNull();
    expect($notification->recipient_email)->toBe('mario@goldenresort.com');
    expect($notification->status)->toBe('sent');

    // Verify history audit log
    $history = MaintenanceRequestHistory::where('maintenance_request_id', $maintenance->id)
        ->where('action', 'assigned')
        ->latest('id')
        ->first();

    expect($history)->not->toBeNull();
    expect($history->actor_role)->toBe('admin');
    expect($history->changes_payload)->toHaveKey('assigned_to');
    expect($history->changes_payload['assigned_to']['to'])->toBe($this->tech1->id);
    expect($history->changes_payload['assigned_to']['to_name'])->toBe('Mario Electrician');
});

test('dispatches reassignment notification when task is assigned to a different technician', function () {
    $maintenance = MaintenanceRequest::create([
        'title' => 'Water Leak in Bathroom',
        'description' => 'Pipe leaking under the sink.',
        'resource_type' => 'room',
        'room_id' => $this->room->id,
        'resource_name' => $this->room->name,
        'priority' => 'urgent',
        'status' => 'assigned',
        'reported_by_user_id' => $this->admin->id,
        'assigned_to_user_id' => $this->tech1->id,
        'assigned_at' => now(),
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
        ->postJson("/api/admin/maintenance/{$maintenance->id}/assign", [
            'assigned_to_user_id' => $this->tech2->id,
            'notes' => 'Reassigning to plumbing specialist.',
        ]);

    $response->assertStatus(200);

    Mail::assertQueued(MaintenanceTaskAssignedMail::class, function ($mail) {
        return $mail->hasTo('luigi@goldenresort.com') &&
               $mail->assignee->id === $this->tech2->id &&
               $mail->isReassignment === true;
    });

    $notification = BookingNotification::where('maintenance_request_id', $maintenance->id)
        ->where('notification_type', 'maintenance_task_reassigned')
        ->first();

    expect($notification)->not->toBeNull();
    expect($notification->recipient_email)->toBe('luigi@goldenresort.com');

    $history = MaintenanceRequestHistory::where('maintenance_request_id', $maintenance->id)
        ->where('action', 'reassigned')
        ->first();

    expect($history)->not->toBeNull();
    expect($history->changes_payload['assigned_to']['from'])->toBe($this->tech1->id);
    expect($history->changes_payload['assigned_to']['to'])->toBe($this->tech2->id);
});

test('dispatches progress alert email to admin when technician updates progress or places task on hold', function () {
    $maintenance = MaintenanceRequest::create([
        'title' => 'Replace Lighting Fixture',
        'description' => 'Chandelier bulb replacement.',
        'resource_type' => 'room',
        'room_id' => $this->room->id,
        'resource_name' => $this->room->name,
        'priority' => 'medium',
        'status' => 'in_progress',
        'reported_by_user_id' => $this->admin->id,
        'assigned_to_user_id' => $this->tech1->id,
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->tech1Token}")
        ->postJson("/api/admin/maintenance/{$maintenance->id}/progress", [
            'notes' => 'Awaiting specialized bulb delivery from supplier.',
            'cost_php' => 1250.00,
            'status' => 'on_hold',
        ]);

    $response->assertStatus(200);

    Mail::assertQueued(MaintenanceTaskProgressAlertMail::class, function ($mail) {
        return $mail->hasTo('admin@goldenresort.com') &&
               $mail->currentStatus === 'on_hold' &&
               $mail->recordedCost === 1250.00;
    });

    $notification = BookingNotification::where('maintenance_request_id', $maintenance->id)
        ->where('notification_type', 'maintenance_progress_alert')
        ->first();

    expect($notification)->not->toBeNull();
    expect($notification->status)->toBe('sent');

    $history = MaintenanceRequestHistory::where('maintenance_request_id', $maintenance->id)
        ->where('action', 'put_on_hold')
        ->first();

    expect($history)->not->toBeNull();
    expect($history->actor_role)->toBe('maintenance');
    expect($history->changes_payload['status']['to'])->toBe('on_hold');
    expect((float) $history->changes_payload['cost_php']['to'])->toBe(1250.0);
});

test('dispatches review submitted alert to admin when technician submits completion', function () {
    $maintenance = MaintenanceRequest::create([
        'title' => 'Balcony Door Latch Repair',
        'description' => 'Fix latch mechanism.',
        'resource_type' => 'room',
        'room_id' => $this->room->id,
        'resource_name' => $this->room->name,
        'priority' => 'low',
        'status' => 'in_progress',
        'reported_by_user_id' => $this->admin->id,
        'assigned_to_user_id' => $this->tech1->id,
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->tech1Token}")
        ->postJson("/api/admin/maintenance/{$maintenance->id}/submit-review", [
            'completion_notes' => 'Replaced locking pins and tested door seal.',
            'cost_php' => 450.00,
        ]);

    $response->assertStatus(200);

    Mail::assertQueued(MaintenanceReviewSubmittedMail::class, function ($mail) {
        return $mail->hasTo('admin@goldenresort.com') &&
               $mail->completionNotes === 'Replaced locking pins and tested door seal.' &&
               $mail->finalCost === 450.00;
    });

    $notification = BookingNotification::where('maintenance_request_id', $maintenance->id)
        ->where('notification_type', 'maintenance_review_submitted')
        ->first();

    expect($notification)->not->toBeNull();
    expect($notification->status)->toBe('sent');

    $history = MaintenanceRequestHistory::where('maintenance_request_id', $maintenance->id)
        ->where('action', 'submitted_for_review')
        ->first();

    expect($history)->not->toBeNull();
    expect($history->changes_payload['status']['to'])->toBe('pending_review');
});

test('dispatches decision email to technician when administrator reviews completion', function () {
    $maintenance = MaintenanceRequest::create([
        'title' => 'Thermostat Calibration',
        'description' => 'Calibrate digital sensor.',
        'resource_type' => 'room',
        'room_id' => $this->room->id,
        'resource_name' => $this->room->name,
        'priority' => 'medium',
        'status' => 'pending_review',
        'reported_by_user_id' => $this->admin->id,
        'assigned_to_user_id' => $this->tech1->id,
    ]);

    // Test rejection / revision request
    $rejectResponse = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
        ->postJson("/api/admin/maintenance/{$maintenance->id}/review", [
            'action' => 'reject',
            'notes' => 'Temperature still reads 3 degrees above threshold. Please recheck.',
        ]);

    $rejectResponse->assertStatus(200);

    Mail::assertQueued(MaintenanceReviewDecisionMail::class, function ($mail) {
        return $mail->hasTo('mario@goldenresort.com') &&
               $mail->action === 'reject';
    });

    $rejectNotification = BookingNotification::where('maintenance_request_id', $maintenance->id)
        ->where('notification_type', 'maintenance_review_rejected')
        ->first();

    expect($rejectNotification)->not->toBeNull();

    // Now test approval
    $maintenance->update(['status' => 'pending_review']);

    $approveResponse = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
        ->postJson("/api/admin/maintenance/{$maintenance->id}/review", [
            'action' => 'approve',
            'notes' => 'Verified calibrated and functioning perfectly.',
        ]);

    $approveResponse->assertStatus(200);

    Mail::assertQueued(MaintenanceReviewDecisionMail::class, function ($mail) {
        return $mail->hasTo('mario@goldenresort.com') &&
               $mail->action === 'approve';
    });

    $approveNotification = BookingNotification::where('maintenance_request_id', $maintenance->id)
        ->where('notification_type', 'maintenance_review_approved')
        ->first();

    expect($approveNotification)->not->toBeNull();
});

test('enforces strict immutability on MaintenanceRequestHistory preventing update and delete', function () {
    $maintenance = MaintenanceRequest::create([
        'title' => 'Door lock repair',
        'description' => 'Fix broken latch',
        'resource_type' => 'room',
        'room_id' => $this->room->id,
        'resource_name' => $this->room->name,
        'status' => 'reported',
    ]);

    $history = MaintenanceRequestHistory::create([
        'maintenance_request_id' => $maintenance->id,
        'user_id' => $this->admin->id,
        'actor_role' => 'admin',
        'action' => 'created',
        'to_status' => 'reported',
        'notes' => 'Original audit log entry',
    ]);

    // Updating must throw RuntimeException
    expect(fn () => $history->update(['notes' => 'Tampered notes']))
        ->toThrow(\RuntimeException::class, 'Maintenance audit logs are immutable and cannot be updated.');

    // Deleting must throw RuntimeException
    expect(fn () => $history->delete())
        ->toThrow(\RuntimeException::class, 'Maintenance audit logs are immutable and cannot be deleted.');

    // Verify history record remains intact
    expect($history->fresh()->notes)->toBe('Original audit log entry');
});

test('survives mail transport failures non-blockingly without rolling back maintenance transaction', function () {
    // Force Mail facade to throw exception
    Mail::shouldReceive('to')->andThrow(new \Exception('SMTP Connection timeout'));

    $maintenance = MaintenanceRequest::create([
        'title' => 'Elevator Sensor Glitch',
        'description' => 'Floor 3 door sensor jitter.',
        'resource_type' => 'facility',
        'resource_name' => 'Main Wing Elevator',
        'priority' => 'urgent',
        'status' => 'reported',
        'reported_by_user_id' => $this->admin->id,
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
        ->postJson("/api/admin/maintenance/{$maintenance->id}/assign", [
            'assigned_to_user_id' => $this->tech1->id,
            'notes' => 'Urgent check needed.',
        ]);

    // Controller should respond with 200 despite mail delivery failure
    $response->assertStatus(200);

    // Database record was successfully updated
    expect($maintenance->fresh()->assigned_to_user_id)->toBe($this->tech1->id);
    expect($maintenance->fresh()->status)->toBe('assigned');

    // Failed notification record was captured
    $notification = BookingNotification::where('maintenance_request_id', $maintenance->id)
        ->where('notification_type', 'maintenance_task_assigned')
        ->first();

    expect($notification)->not->toBeNull();
    expect($notification->status)->toBe('failed');
    expect($notification->error_message)->toContain('SMTP Connection timeout');
});

test('admin notification index API includes maintenance details and filtering', function () {
    $maintenance = MaintenanceRequest::create([
        'title' => 'Pool Filtration Check',
        'description' => 'Pool maintenance check',
        'resource_type' => 'facility',
        'resource_name' => 'Infinity Pool',
        'priority' => 'medium',
        'status' => 'reported',
    ]);

    $notification = BookingNotification::create([
        'maintenance_request_id' => $maintenance->id,
        'recipient_email' => 'tech@goldenresort.com',
        'recipient_type' => 'staff',
        'notification_type' => 'maintenance_task_assigned',
        'channel' => 'mail',
        'subject' => "Task Assigned: {$maintenance->title}",
        'status' => 'sent',
        'idempotency_key' => 'test_mnt_idx_'.uniqid(),
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
        ->getJson("/api/admin/notifications?search=Infinity+Pool");

    $response->assertStatus(200)
        ->assertJsonFragment([
            'id' => $notification->id,
            'maintenance_request_id' => $maintenance->id,
            'tracking_number' => $maintenance->tracking_number,
            'resource_name' => 'Infinity Pool',
        ]);
});
