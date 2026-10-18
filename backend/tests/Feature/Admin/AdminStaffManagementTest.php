<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::create([
        'name' => 'Resort Admin',
        'email' => 'admin@test.com',
        'password' => Hash::make('password123'),
        'role' => 'admin',
        'is_active' => true,
    ]);
    $this->adminToken = $this->admin->createToken('admin-token')->plainTextToken;

    $this->staff = User::create([
        'name' => 'Front Desk Officer',
        'email' => 'frontdesk@test.com',
        'password' => Hash::make('password123'),
        'role' => 'front_desk',
        'is_active' => true,
        'department' => 'Front Office',
    ]);
    $this->staffToken = $this->staff->createToken('staff-token')->plainTextToken;
});

test('admin can list staff accounts with metrics and pagination', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->getJson('/api/admin/staff');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'name', 'email', 'role', 'is_active', 'department'],
            ],
            'metrics' => [
                'total',
                'active',
                'deactivated',
                'roles',
            ],
            'meta' => ['current_page', 'last_page', 'per_page', 'total'],
        ])
        ->assertJsonPath('metrics.total', 2)
        ->assertJsonPath('metrics.active', 2);
});

test('admin can filter staff accounts by role and search query', function () {
    // Search by name
    $searchRes = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->getJson('/api/admin/staff?search=Front');

    $searchRes->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.email', 'frontdesk@test.com');

    // Filter by role
    $roleRes = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->getJson('/api/admin/staff?role=admin');

    $roleRes->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.email', 'admin@test.com');
});

test('admin can create a new staff account with valid data', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->postJson('/api/admin/staff', [
            'name' => 'Maria Santos',
            'email' => 'maria@goldenresort.com',
            'role' => 'housekeeper',
            'password' => 'SecurePass2026!',
            'phone' => '+639171234567',
            'department' => 'Housekeeping',
            'notes' => 'Experienced room attendant.',
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('staff.name', 'Maria Santos')
        ->assertJsonPath('staff.email', 'maria@goldenresort.com')
        ->assertJsonPath('staff.role', 'housekeeper')
        ->assertJsonPath('staff.is_active', true);

    $this->assertDatabaseHas('users', [
        'email' => 'maria@goldenresort.com',
        'role' => 'housekeeper',
        'is_active' => 1,
    ]);

    expect(Hash::check('SecurePass2026!', User::where('email', 'maria@goldenresort.com')->first()->password))->toBeTrue();
});

test('staff creation validates unique email, valid role and minimum password length', function () {
    // Duplicate email
    $duplicateRes = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->postJson('/api/admin/staff', [
            'name' => 'Duplicate Email',
            'email' => 'frontdesk@test.com',
            'role' => 'front_desk',
            'password' => 'password123',
        ]);
    $duplicateRes->assertStatus(422)
        ->assertJsonValidationErrors(['email']);

    // Invalid role
    $invalidRoleRes = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->postJson('/api/admin/staff', [
            'name' => 'Invalid Role',
            'email' => 'unique@test.com',
            'role' => 'superman',
            'password' => 'password123',
        ]);
    $invalidRoleRes->assertStatus(422)
        ->assertJsonValidationErrors(['role']);

    // Short password
    $shortPassRes = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->postJson('/api/admin/staff', [
            'name' => 'Short Pass',
            'email' => 'unique@test.com',
            'role' => 'staff',
            'password' => '123',
        ]);
    $shortPassRes->assertStatus(422)
        ->assertJsonValidationErrors(['password']);
});

test('admin can view staff member details with permissions', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->getJson("/api/admin/staff/{$this->staff->id}");

    $response->assertStatus(200)
        ->assertJsonPath('staff.id', $this->staff->id)
        ->assertJsonStructure([
            'staff' => ['id', 'name', 'email', 'role', 'is_active'],
            'permissions',
        ]);

    expect($response->json('permissions'))->toContain('reservations.manage');
});

test('admin can update staff profile information', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->putJson("/api/admin/staff/{$this->staff->id}", [
            'name' => 'Senior Front Desk Officer',
            'role' => 'manager',
            'phone' => '+639179998888',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('staff.name', 'Senior Front Desk Officer')
        ->assertJsonPath('staff.role', 'manager');

    expect($this->staff->fresh()->role)->toBe('manager');
});

test('anti-lockout prevents demoting the last active administrator', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->putJson("/api/admin/staff/{$this->admin->id}", [
            'role' => 'front_desk',
        ]);

    $response->assertStatus(422)
        ->assertJsonPath('message', 'Cannot demote the last active administrator. Create or promote another administrator first.');

    expect($this->admin->fresh()->role)->toBe('admin');
});

test('admin can deactivate and reactivate staff account', function () {
    // Deactivate
    $deactivateRes = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->patchJson("/api/admin/staff/{$this->staff->id}/toggle-active");

    $deactivateRes->assertStatus(200)
        ->assertJsonPath('staff.is_active', false);

    expect($this->staff->fresh()->is_active)->toBeFalse();
    // Tokens revoked
    expect($this->staff->fresh()->tokens)->toHaveCount(0);

    // Reactivate
    $reactivateRes = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->patchJson("/api/admin/staff/{$this->staff->id}/toggle-active");

    $reactivateRes->assertStatus(200)
        ->assertJsonPath('staff.is_active', true);

    expect($this->staff->fresh()->is_active)->toBeTrue();
});

test('anti-lockout prevents admin from deactivating themselves', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->patchJson("/api/admin/staff/{$this->admin->id}/toggle-active");

    $response->assertStatus(422)
        ->assertJsonPath('message', 'Security restriction: You cannot deactivate your own account.');

    expect($this->admin->fresh()->is_active)->toBeTrue();
});

test('admin can securely reset staff password and terminate existing sessions', function () {
    // Give staff an active token
    $this->staff->createToken('active-session-token');
    expect($this->staff->fresh()->tokens->count())->toBeGreaterThan(0);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken)
        ->postJson("/api/admin/staff/{$this->staff->id}/reset-password", [
            'password' => 'BrandNewPassword2026!',
            'password_confirmation' => 'BrandNewPassword2026!',
        ]);

    $response->assertStatus(200)
        ->assertJsonStructure(['message']);

    // Existing sessions revoked
    expect($this->staff->fresh()->tokens)->toHaveCount(0);

    // Can authenticate with brand new password
    $loginRes = $this->postJson('/api/admin/login', [
        'email' => 'frontdesk@test.com',
        'password' => 'BrandNewPassword2026!',
    ]);
    $loginRes->assertStatus(200);
});

test('non-admin staff is forbidden from managing staff accounts', function () {
    $response = $this->withHeader('Authorization', 'Bearer '.$this->staffToken)
        ->getJson('/api/admin/staff');

    $response->assertStatus(403);
});
