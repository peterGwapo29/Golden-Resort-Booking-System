<?php

use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('can list active rooms', function () {
    Room::create([
        'slug' => 'test-room',
        'name' => 'Test Room',
        'category' => 'room',
        'tagline' => 'A nice test room',
        'description' => 'Description here',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 5000.00,
        'total_inventory' => 2,
        'max_guests' => 2,
        'adults_capacity' => 2,
        'children_capacity' => 1,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 40,
        'view' => 'Garden',
        'amenities' => ['Wi-Fi'],
        'featured_image' => ['src' => 'https://example.com/img.jpg', 'alt' => 'test', 'source' => 'https://example.com'],
        'gallery' => [],
        'is_active' => true,
    ]);

    Room::create([
        'slug' => 'inactive-room',
        'name' => 'Inactive Room',
        'category' => 'suite',
        'tagline' => 'Inactive',
        'description' => 'Inactive',
        'long_description' => ['Inactive'],
        'nightly_rate_php' => 9000.00,
        'total_inventory' => 1,
        'max_guests' => 4,
        'adults_capacity' => 4,
        'children_capacity' => 2,
        'bed_configuration' => '2 Beds',
        'size_sqm' => 60,
        'view' => 'Pool',
        'amenities' => [],
        'featured_image' => ['src' => 'https://example.com/img2.jpg', 'alt' => 'test2', 'source' => 'https://example.com'],
        'gallery' => [],
        'is_active' => false,
    ]);

    $response = $this->getJson('/api/rooms');

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonFragment(['slug' => 'test-room'])
        ->assertJsonMissing(['slug' => 'inactive-room']);
});

test('can retrieve single room by slug', function () {
    Room::create([
        'slug' => 'deluxe-room',
        'name' => 'Deluxe Room',
        'category' => 'room',
        'tagline' => 'Deluxe Room Tagline',
        'description' => 'Deluxe Room Description',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 6000.00,
        'total_inventory' => 1,
        'max_guests' => 2,
        'adults_capacity' => 2,
        'children_capacity' => 1,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 45,
        'view' => 'Ocean',
        'amenities' => ['Wi-Fi', 'AC'],
        'featured_image' => ['src' => 'https://example.com/img.jpg', 'alt' => 'test', 'source' => 'https://example.com'],
        'gallery' => [],
        'is_active' => true,
    ]);

    $response = $this->getJson('/api/rooms/deluxe-room');

    $response->assertStatus(200)
        ->assertJsonPath('data.slug', 'deluxe-room')
        ->assertJsonPath('data.name', 'Deluxe Room')
        ->assertJsonPath('data.nightly_rate_php', 6000);
});

test('returns 404 for non existent room', function () {
    $response = $this->getJson('/api/rooms/non-existent-room');

    $response->assertStatus(404);
});

test('returns 404 for inactive room on public detail endpoint', function () {
    Room::create([
        'slug' => 'deactivated-suite',
        'name' => 'Deactivated Suite',
        'category' => 'suite',
        'tagline' => 'Inactive suite',
        'description' => 'Inactive',
        'long_description' => ['Inactive'],
        'nightly_rate_php' => 8000.00,
        'total_inventory' => 1,
        'max_guests' => 2,
        'adults_capacity' => 2,
        'children_capacity' => 0,
        'bed_configuration' => '1 Bed',
        'size_sqm' => 50,
        'view' => 'Garden',
        'amenities' => [],
        'featured_image' => ['src' => 'https://example.com/img.jpg', 'alt' => 'test', 'source' => 'https://example.com'],
        'gallery' => [],
        'is_active' => false,
    ]);

    $response = $this->getJson('/api/rooms/deactivated-suite');

    $response->assertStatus(404);
});
