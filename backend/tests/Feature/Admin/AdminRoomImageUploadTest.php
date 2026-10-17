<?php

use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function fakeImageFile(string $filename, int $kb = 100): UploadedFile
{
    // 1x1 valid PNG binary that does not depend on PHP GD extension
    $pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    $content = base64_decode($pngBase64);
    if ($kb > 1) {
        $content .= str_repeat('0', max(0, ($kb * 1024) - strlen($content)));
    }

    return UploadedFile::fake()->createWithContent($filename, $content);
}

beforeEach(function () {
    Storage::fake('public');

    $this->admin = User::create([
        'name' => 'Admin User',
        'email' => 'admin_upload@test.com',
        'password' => Hash::make('password123'),
        'role' => 'admin',
    ]);
    $this->token = $this->admin->createToken('admin-token')->plainTextToken;

    $this->staff = User::create([
        'name' => 'Staff User',
        'email' => 'staff_upload@test.com',
        'password' => Hash::make('password123'),
        'role' => 'staff',
    ]);
    $this->staffToken = $this->staff->createToken('staff-token')->plainTextToken;
});

test('admin can create accommodation with valid image file', function () {
    $file = fakeImageFile('luxury_suite.png', 500);

    $payload = [
        'name' => 'Coral Reef Villa',
        'slug' => 'coral-reef-villa',
        'category' => 'villa',
        'tagline' => 'Private oceanside paradise',
        'description' => 'A luxury villa with private plunge pool.',
        'long_description' => ['Paragraph 1 of luxury villa.'],
        'nightly_rate_php' => 25000.00,
        'total_inventory' => 2,
        'max_guests' => 4,
        'adults_capacity' => 3,
        'children_capacity' => 1,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 120,
        'view' => 'Ocean View',
        'amenities' => ['Private Pool', 'Butler Service'],
        'image' => $file,
        'image_alt' => 'Coral Reef Villa with ocean view',
        'is_active' => true,
    ];

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->post('/api/admin/rooms', $payload);

    $response->assertStatus(201);
    $data = $response->json('data');

    expect($data['featured_image'])->toBeArray()
        ->and($data['featured_image']['alt'])->toBe('Coral Reef Villa with ocean view')
        ->and($data['featured_image']['source'])->toBe('upload')
        ->and($data['featured_image']['src'])->toContain('/storage/accommodations/');

    $room = Room::where('slug', 'coral-reef-villa')->first();
    expect($room)->not->toBeNull();
    $path = $room->featured_image['path'];
    expect($path)->toStartWith('accommodations/');
    Storage::disk('public')->assertExists($path);
});

test('admin can update accommodation and replace existing image with safe cleanup', function () {
    $room = Room::create([
        'slug' => 'sunset-pavilion',
        'name' => 'Sunset Pavilion',
        'category' => 'suite',
        'tagline' => 'Sunset suite',
        'description' => 'Sunset suite description',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 12000.00,
        'total_inventory' => 2,
        'max_guests' => 2,
        'adults_capacity' => 2,
        'children_capacity' => 0,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 65,
        'view' => 'Sunset View',
        'amenities' => ['Balcony'],
        'featured_image' => [
            'src' => Storage::disk('public')->url('accommodations/old_image.png'),
            'alt' => 'Initial image',
            'source' => 'upload',
            'disk' => 'public',
            'path' => 'accommodations/old_image.png',
        ],
        'gallery' => [],
        'is_active' => true,
    ]);

    Storage::disk('public')->put('accommodations/old_image.png', 'initial content');
    Storage::disk('public')->assertExists('accommodations/old_image.png');

    $file2 = fakeImageFile('replacement.png', 800);

    $updatePayload = [
        'name' => 'Sunset Pavilion Suite',
        'slug' => 'sunset-pavilion',
        'category' => 'suite',
        'tagline' => 'Sunset suite updated',
        'description' => 'Sunset suite description updated',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 13500.00,
        'total_inventory' => 2,
        'max_guests' => 2,
        'adults_capacity' => 2,
        'children_capacity' => 0,
        'bed_configuration' => '1 King Bed',
        'size_sqm' => 65,
        'view' => 'Sunset View',
        'amenities' => ['Balcony'],
        'image' => $file2,
        'image_alt' => 'Updated sunset view',
    ];

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->post("/api/admin/rooms/{$room->id}", $updatePayload);

    $response->assertStatus(200);

    $room->refresh();
    $newPath = $room->featured_image['path'];

    // Verify new image was stored
    Storage::disk('public')->assertExists($newPath);
    // Verify old image was deleted safely
    Storage::disk('public')->assertMissing('accommodations/old_image.png');
    expect($room->featured_image['alt'])->toBe('Updated sunset view');
});

test('admin can update accommodation without file and preserve existing image', function () {
    $room = Room::create([
        'slug' => 'garden-bungalow',
        'name' => 'Garden Bungalow',
        'category' => 'room',
        'tagline' => 'Quiet garden',
        'description' => 'Garden description',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 7000.00,
        'total_inventory' => 3,
        'max_guests' => 2,
        'adults_capacity' => 2,
        'children_capacity' => 1,
        'bed_configuration' => '1 Queen Bed',
        'size_sqm' => 45,
        'view' => 'Garden',
        'amenities' => ['Wi-Fi'],
        'featured_image' => [
            'src' => 'https://images.unsplash.com/photo-sample?auto=format&fit=crop&w=1200',
            'alt' => 'Preserved Garden Bungalow Image',
            'source' => 'https://images.unsplash.com/photo-sample',
        ],
        'gallery' => [],
        'is_active' => true,
    ]);

    $updatePayload = [
        'name' => 'Garden Bungalow Renovation',
        'slug' => 'garden-bungalow',
        'category' => 'room',
        'tagline' => 'Quiet garden updated',
        'description' => 'Garden description updated',
        'long_description' => ['Paragraph 1'],
        'nightly_rate_php' => 7500.00,
        'total_inventory' => 3,
        'max_guests' => 2,
        'adults_capacity' => 2,
        'children_capacity' => 1,
        'bed_configuration' => '1 Queen Bed',
        'size_sqm' => 45,
        'view' => 'Garden',
        'amenities' => ['Wi-Fi', 'Coffee Machine'],
    ];

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->putJson("/api/admin/rooms/{$room->id}", $updatePayload);

    $response->assertStatus(200);

    $room->refresh();
    expect($room->featured_image['src'])->toBe('https://images.unsplash.com/photo-sample?auto=format&fit=crop&w=1200')
        ->and($room->featured_image['alt'])->toBe('Preserved Garden Bungalow Image');
});

test('rejects unsupported file formats and oversized uploads', function () {
    // 1. Text file with .jpg extension (not real image)
    $fakeImage = UploadedFile::fake()->create('fake_image.jpg', 500, 'text/plain');

    $response = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->post('/api/admin/rooms', [
            'name' => 'Invalid Room',
            'slug' => 'invalid-room',
            'category' => 'room',
            'tagline' => 'Test',
            'description' => 'Test',
            'long_description' => ['Test'],
            'nightly_rate_php' => 5000.00,
            'total_inventory' => 1,
            'max_guests' => 2,
            'adults_capacity' => 2,
            'children_capacity' => 0,
            'bed_configuration' => '1 Bed',
            'size_sqm' => 40,
            'view' => 'Garden',
            'amenities' => ['Wi-Fi'],
            'image' => $fakeImage,
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['image']);

    // 2. Oversized image (> 5 MB)
    $oversizedImage = fakeImageFile('huge.png', 6000);

    $response2 = $this->withHeader('Authorization', 'Bearer '.$this->token)
        ->post('/api/admin/rooms', [
            'name' => 'Oversized Room',
            'slug' => 'oversized-room',
            'category' => 'room',
            'tagline' => 'Test',
            'description' => 'Test',
            'long_description' => ['Test'],
            'nightly_rate_php' => 5000.00,
            'total_inventory' => 1,
            'max_guests' => 2,
            'adults_capacity' => 2,
            'children_capacity' => 0,
            'bed_configuration' => '1 Bed',
            'size_sqm' => 40,
            'view' => 'Garden',
            'amenities' => ['Wi-Fi'],
            'image' => $oversizedImage,
        ]);

    $response2->assertStatus(422)
        ->assertJsonValidationErrors(['image']);
});

test('unauthorized non-admin users cannot upload accommodation images', function () {
    $file = fakeImageFile('unauthorized.png', 200);

    $response = $this->withHeader('Authorization', 'Bearer '.$this->staffToken)
        ->post('/api/admin/rooms', [
            'name' => 'Staff Room',
            'slug' => 'staff-room',
            'category' => 'room',
            'tagline' => 'Test',
            'description' => 'Test',
            'long_description' => ['Test'],
            'nightly_rate_php' => 5000.00,
            'total_inventory' => 1,
            'max_guests' => 2,
            'adults_capacity' => 2,
            'children_capacity' => 0,
            'bed_configuration' => '1 Bed',
            'size_sqm' => 40,
            'view' => 'Garden',
            'amenities' => ['Wi-Fi'],
            'image' => $file,
        ]);

    $response->assertStatus(403);
});

test('room resource handles missing file on disk by safely falling back to default image', function () {
    $room = Room::create([
        'slug' => 'lost-image-room',
        'name' => 'Lost Image Room',
        'category' => 'room',
        'tagline' => 'Test',
        'description' => 'Test description',
        'long_description' => ['Test'],
        'nightly_rate_php' => 8000.00,
        'total_inventory' => 1,
        'max_guests' => 2,
        'adults_capacity' => 2,
        'children_capacity' => 0,
        'bed_configuration' => '1 Bed',
        'size_sqm' => 40,
        'view' => 'Garden',
        'amenities' => ['Wi-Fi'],
        'featured_image' => [
            'src' => Storage::disk('public')->url('accommodations/non_existent.png'),
            'alt' => 'Non existent image',
            'source' => 'upload',
            'disk' => 'public',
            'path' => 'accommodations/non_existent.png',
        ],
        'gallery' => [
            [
                'src' => Storage::disk('public')->url('accommodations/non_existent.png'),
                'alt' => 'Non existent gallery image',
                'source' => 'upload',
                'disk' => 'public',
                'path' => 'accommodations/non_existent.png',
            ],
        ],
        'is_active' => true,
    ]);

    // Ensure file does not exist on disk
    Storage::disk('public')->assertMissing('accommodations/non_existent.png');

    $response = $this->getJson("/api/rooms/{$room->slug}");
    $response->assertStatus(200);

    $data = $response->json('data');
    expect($data['featured_image']['source'])->toBe('fallback')
        ->and($data['featured_image']['src'])->toContain('images.unsplash.com')
        ->and($data['image_url'])->toContain('images.unsplash.com')
        ->and($data['gallery'][0]['source'])->toBe('fallback')
        ->and($data['gallery'][0]['src'])->toContain('images.unsplash.com');
});
