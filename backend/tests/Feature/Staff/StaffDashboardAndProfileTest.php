<?php

use App\Models\HousekeepingTask;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function createTestRoom(array $overrides = []): Room
{
    return Room::create(array_merge([
        'slug' => 'deluxe-garden-room-'.uniqid(),
        'name' => 'Deluxe Garden Room',
        'category' => 'room',
        'tagline' => 'Tranquil garden sanctuary',
        'description' => 'A beautiful garden room',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 4500.00,
        'total_inventory' => 1,
        'max_guests' => 2,
        'adults_capacity' => 2,
        'children_capacity' => 1,
        'bed_configuration' => '1 Queen Bed',
        'size_sqm' => 38,
        'view' => 'Garden',
        'amenities' => ['Wi-Fi', 'Balcony'],
        'featured_image' => ['src' => '/images/deluxe.jpg', 'alt' => 'Deluxe Garden Room', 'source' => '/images/deluxe.jpg'],
        'gallery' => [],
        'is_active' => true,
        'housekeeping_status' => 'clean',
    ], $overrides));
}

beforeEach(function () {
    $this->admin = User::create([
        'name' => 'Executive Administrator',
        'email' => 'admin@test.com',
        'password' => Hash::make('password123'),
        'role' => 'admin',
        'is_active' => true,
    ]);
    $this->adminToken = $this->admin->createToken('admin-token')->plainTextToken;

    $this->housekeeper = User::create([
        'name' => 'Maria Santos',
        'email' => 'maria@test.com',
        'password' => Hash::make('password123'),
        'role' => 'housekeeper',
        'is_active' => true,
        'department' => 'Housekeeping',
        'phone' => '+63 917 111 2222',
    ]);
    $this->housekeeperToken = $this->housekeeper->createToken('housekeeper-token')->plainTextToken;

    $this->frontDesk = User::create([
        'name' => 'Juan Dela Cruz',
        'email' => 'juan@test.com',
        'password' => Hash::make('password123'),
        'role' => 'front_desk',
        'is_active' => true,
        'department' => 'Front Office',
    ]);
    $this->frontDeskToken = $this->frontDesk->createToken('frontdesk-token')->plainTextToken;
});

test('staff can retrieve their own profile with permissions', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->housekeeperToken)
        ->getJson('/api/staff/profile');

    $response->assertStatus(200)
        ->assertJsonPath('user.id', $this->housekeeper->id)
        ->assertJsonPath('user.name', 'Maria Santos')
        ->assertJsonPath('user.email', 'maria@test.com')
        ->assertJsonPath('user.role', 'housekeeper')
        ->assertJsonPath('user.department', 'Housekeeping')
        ->assertJsonPath('user.phone', '+63 917 111 2222')
        ->assertJsonStructure([
            'user' => ['id', 'name', 'email', 'role', 'is_active', 'phone', 'department', 'permissions'],
        ]);

    expect($response->json('user.permissions'))->toContain('housekeeping.manage', 'rooms.view');
});

test('staff can update permitted profile fields (name, phone)', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->housekeeperToken)
        ->putJson('/api/staff/profile', [
            'name' => 'Maria Santos-Reyes',
            'phone' => '+63 918 999 8888',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('message', 'Profile updated successfully.')
        ->assertJsonPath('user.name', 'Maria Santos-Reyes')
        ->assertJsonPath('user.phone', '+63 918 999 8888');

    $this->housekeeper->refresh();
    expect($this->housekeeper->name)->toBe('Maria Santos-Reyes');
    expect($this->housekeeper->phone)->toBe('+63 918 999 8888');
});

test('staff cannot change role, email, or active status via profile update', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->housekeeperToken)
        ->putJson('/api/staff/profile', [
            'name' => 'Maria Santos',
            'email' => 'hacked@test.com',
            'role' => 'admin',
            'is_active' => false,
        ]);

    $response->assertStatus(200);

    $this->housekeeper->refresh();
    expect($this->housekeeper->email)->toBe('maria@test.com');
    expect($this->housekeeper->role)->toBe('housekeeper');
    expect($this->housekeeper->is_active)->toBeTrue();
});

test('profile update validates required name and phone regex', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->housekeeperToken)
        ->putJson('/api/staff/profile', [
            'name' => '',
            'phone' => 'invalid-phone-letters-here!!',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['name', 'phone']);
});

test('staff can change password with valid current password', function () {
    // Create an extra token to verify other sessions are revoked
    $extraToken = $this->housekeeper->createToken('mobile-session')->plainTextToken;
    expect($this->housekeeper->fresh()->tokens)->toHaveCount(2);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->housekeeperToken)
        ->postJson('/api/staff/profile/password', [
            'current_password' => 'password123',
            'password' => 'newSecretPass2026',
            'password_confirmation' => 'newSecretPass2026',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('message', 'Password changed successfully. Other active sessions have been signed out.');

    $this->housekeeper->refresh();
    expect(Hash::check('newSecretPass2026', $this->housekeeper->password))->toBeTrue();

    // Verify other token was deleted from database
    expect($this->housekeeper->fresh()->tokens)->toHaveCount(1);

    // Forget cached auth guards to test next request with extraToken
    auth()->forgetGuards();

    // Verify other token was revoked
    $staleResponse = $this->withHeader('Authorization', 'Bearer '.$extraToken)
        ->getJson('/api/staff/profile');
    $staleResponse->assertStatus(401);
});

test('password change fails when current password is wrong', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->housekeeperToken)
        ->postJson('/api/staff/profile/password', [
            'current_password' => 'wrong-pass',
            'password' => 'newSecretPass2026',
            'password_confirmation' => 'newSecretPass2026',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['current_password']);
});

test('password change fails when new password is short or unconfirmed', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->housekeeperToken)
        ->postJson('/api/staff/profile/password', [
            'current_password' => 'password123',
            'password' => 'short',
            'password_confirmation' => 'mismatch',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['password']);
});

test('staff dashboard returns assigned tasks and role metrics', function () {
    $room = createTestRoom([
        'name' => 'Deluxe Suite 101',
        'slug' => 'deluxe-suite-101',
        'category' => 'suite',
        'housekeeping_status' => 'dirty',
    ]);

    $task = HousekeepingTask::create([
        'room_id' => $room->id,
        'assigned_to_user_id' => $this->housekeeper->id,
        'created_by_user_id' => $this->admin->id,
        'task_type' => 'cleaning',
        'priority' => 'high',
        'status' => 'pending',
        'notes' => 'Priority cleaning for VIP guest',
        'scheduled_date' => Carbon::today()->toDateString(),
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->housekeeperToken)
        ->getJson('/api/staff/dashboard');

    $response->assertStatus(200)
        ->assertJsonPath('user.id', $this->housekeeper->id)
        ->assertJsonPath('metrics.my_open_tasks', 1)
        ->assertJsonPath('metrics.dirty_rooms', 1)
        ->assertJsonCount(1, 'assigned_tasks')
        ->assertJsonPath('assigned_tasks.0.id', $task->id)
        ->assertJsonPath('assigned_tasks.0.room.name', 'Deluxe Suite 101')
        ->assertJsonPath('assigned_tasks.0.priority', 'high')
        ->assertJsonStructure([
            'user',
            'metrics',
            'assigned_tasks',
            'permitted_modules',
        ]);

    $modules = collect($response->json('permitted_modules'));
    expect($modules->firstWhere('key', 'housekeeping')['href'])->toBe('/staff/housekeeping');
    expect($modules->firstWhere('key', 'calendar')['href'])->toBe('/staff/calendar');
});

test('front desk staff can access check-in endpoints but cannot access admin staff or analytics', function () {
    // Permitted: Check-in overview
    $allowed = $this->withHeader('Authorization', 'Bearer '.$this->frontDeskToken)
        ->getJson('/api/admin/check-in-out/overview');
    $allowed->assertStatus(200);

    // Forbidden: Admin analytics
    $deniedAnalytics = $this->withHeader('Authorization', 'Bearer '.$this->frontDeskToken)
        ->getJson('/api/admin/analytics');
    $deniedAnalytics->assertStatus(403);

    // Forbidden: Staff accounts management
    $deniedStaff = $this->withHeader('Authorization', 'Bearer '.$this->frontDeskToken)
        ->getJson('/api/admin/staff');
    $deniedStaff->assertStatus(403);
});

test('housekeeper can access housekeeping endpoints but cannot access payments', function () {
    // Permitted: Housekeeping rooms
    $allowed = $this->withHeader('Authorization', 'Bearer '.$this->housekeeperToken)
        ->getJson('/api/admin/housekeeping/rooms');
    $allowed->assertStatus(200);

    // Forbidden: Payments
    $deniedPayments = $this->withHeader('Authorization', 'Bearer '.$this->housekeeperToken)
        ->getJson('/api/admin/payments');
    $deniedPayments->assertStatus(403);
});

test('deactivated staff cannot access staff profile or dashboard', function () {
    $this->housekeeper->update(['is_active' => false]);

    $profileRes = $this->withHeader('Authorization', 'Bearer '.$this->housekeeperToken)
        ->getJson('/api/staff/profile');
    $profileRes->assertStatus(403)
        ->assertJsonPath('message', 'Your account has been deactivated. Please contact an administrator.');

    $dashRes = $this->withHeader('Authorization', 'Bearer '.$this->housekeeperToken)
        ->getJson('/api/staff/dashboard');
    $dashRes->assertStatus(403);
});

test('unauthenticated request to staff endpoints returns 401', function () {
    $this->getJson('/api/staff/profile')->assertStatus(401);
    $this->getJson('/api/staff/dashboard')->assertStatus(401);
});
