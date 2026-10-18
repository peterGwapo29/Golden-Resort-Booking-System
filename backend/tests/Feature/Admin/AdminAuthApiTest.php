<?php

use App\Models\User;
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

    $this->staff = User::create([
        'name' => 'Regular Staff',
        'email' => 'staff@test.com',
        'password' => Hash::make('password123'),
        'role' => 'staff',
    ]);
});

test('admin can login with valid credentials and receive sanctum token', function () {
    $response = $this->postJson('/api/admin/login', [
        'email' => 'admin@test.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'message',
            'token',
            'user' => ['id', 'name', 'email', 'role'],
        ])
        ->assertJsonPath('user.role', 'admin');
});

test('login rejects invalid credentials with 422', function () {
    $response = $this->postJson('/api/admin/login', [
        'email' => 'admin@test.com',
        'password' => 'wrongpassword',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});

test('authorized staff can login with valid credentials and receive sanctum token', function () {
    $response = $this->postJson('/api/admin/login', [
        'email' => 'staff@test.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'message',
            'token',
            'user' => ['id', 'name', 'email', 'role', 'is_active', 'permissions'],
        ])
        ->assertJsonPath('user.role', 'staff')
        ->assertJsonPath('user.is_active', true);
});

test('unauthorized non-staff user is rejected from login with 403', function () {
    User::create([
        'name' => 'Public Guest User',
        'email' => 'guest@test.com',
        'password' => Hash::make('password123'),
        'role' => 'user',
    ]);

    $response = $this->postJson('/api/admin/login', [
        'email' => 'guest@test.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(403)
        ->assertJsonPath('message', 'Access denied. You do not have staff or administrator permissions.');
});

test('deactivated staff user is rejected from login with 403', function () {
    $deactivated = User::create([
        'name' => 'Inactive Staff',
        'email' => 'inactive@test.com',
        'password' => Hash::make('password123'),
        'role' => 'staff',
        'is_active' => false,
    ]);

    $response = $this->postJson('/api/admin/login', [
        'email' => 'inactive@test.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(403)
        ->assertJsonPath('message', 'Your account has been deactivated. Please contact an administrator.');
});

test('deactivated user with existing token is rejected from protected endpoints with 403', function () {
    $token = $this->staff->createToken('staff-token')->plainTextToken;

    // Now deactivate the staff user
    $this->staff->update(['is_active' => false]);

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/admin/me');

    $response->assertStatus(403)
        ->assertJsonPath('message', 'Your account has been deactivated. Please contact an administrator.');
});

test('unauthenticated request to protected admin route is rejected with 401', function () {
    $response = $this->getJson('/api/admin/dashboard/stats');

    $response->assertStatus(401);
});

test('non-admin authenticated user is denied access to admin-only endpoints with 403', function () {
    $token = $this->staff->createToken('staff-token')->plainTextToken;

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/admin/dashboard/stats');

    $response->assertStatus(403);
});

test('admin can retrieve current profile via /api/admin/me', function () {
    $token = $this->admin->createToken('admin-token')->plainTextToken;

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/admin/me');

    $response->assertStatus(200)
        ->assertJsonPath('user.email', 'admin@test.com')
        ->assertJsonPath('user.role', 'admin');
});

test('admin can logout and revoke token', function () {
    $token = $this->admin->createToken('admin-token')->plainTextToken;

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->postJson('/api/admin/logout');

    $response->assertStatus(200)
        ->assertJsonPath('message', 'Successfully logged out.');

    expect($this->admin->fresh()->tokens)->toHaveCount(0);
});
