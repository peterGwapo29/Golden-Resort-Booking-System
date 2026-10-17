<?php

namespace Database\Seeders;

use App\Models\Room;
use Illuminate\Database\Seeder;

class RoomSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $rooms = [
            [
                'slug' => 'deluxe-garden-room',
                'name' => 'Deluxe Garden Room',
                'category' => 'room',
                'tagline' => 'A peaceful sanctuary nestled among lush tropical flora',
                'description' => 'A warm, wood-accented retreat opening onto leafy garden views, ideal for couples seeking quiet comfort.',
                'long_description' => [
                    "Nestled along the resort's quietest botanical path, the Deluxe Garden Room offers a restful refuge surrounded by exotic native palms and vibrant flowering shrubs.",
                    'The interior pairs warm natural hardwoods with breathable ivory linens and handcrafted wicker accents. Step through sliding glass doors onto your private shaded veranda for morning coffee amidst gentle tropical breezes.',
                    'Features a spa-inspired ensuite bathroom with a rainfall shower, organic local bath amenities, and thoughtful details designed for deep relaxation.',
                ],
                'nightly_rate_php' => 6500.00,
                'total_inventory' => 2,
                'max_guests' => 2,
                'adults_capacity' => 2,
                'children_capacity' => 1,
                'bed_configuration' => '1 King Bed or 2 Twin Beds',
                'size_sqm' => 42,
                'view' => 'Tropical Garden View',
                'amenities' => [
                    'Private garden veranda',
                    'Rainfall shower',
                    'High-speed Wi-Fi',
                    'Air conditioning',
                    'Artisanal coffee & tea maker',
                    'Smart HD TV with streaming',
                    'Luxury bathrobes & organic toiletries',
                    'In-room digital safe',
                ],
                'featured_image' => [
                    'src' => 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80',
                    'alt' => 'Wood-paneled bedroom with a large bed and windows looking out onto tropical garden greenery',
                    'source' => 'https://images.unsplash.com/photo-1611892440504-42a792e24d32',
                ],
                'gallery' => [
                    [
                        'src' => 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80',
                        'alt' => 'Deluxe Garden Room king bed framed by warm wood paneling and natural sunlight',
                        'source' => 'https://images.unsplash.com/photo-1611892440504-42a792e24d32',
                    ],
                    [
                        'src' => 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1400&q=80',
                        'alt' => 'Detail of the elegant bedside table, reading lamp, and crisp white bed linens',
                        'source' => 'https://images.unsplash.com/photo-1618773928121-c32242e63f39',
                    ],
                    [
                        'src' => 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1400&q=80',
                        'alt' => 'Private veranda patio seating area overlooking lush green gardens',
                        'source' => 'https://images.unsplash.com/photo-1582719508461-905c673771fd',
                    ],
                ],
                'is_active' => true,
            ],
            [
                'slug' => 'premium-family-suite',
                'name' => 'Premium Family Suite',
                'category' => 'suite',
                'tagline' => 'Expansive multi-room living for shared family memories',
                'description' => 'Generous living space with a separate lounge area, designed so the whole family can unwind together.',
                'long_description' => [
                    'Crafted specifically for traveling families and close-knit groups, the Premium Family Suite balances shared social spaces with private relaxation corners.',
                    'The expansive floor plan includes a dedicated living parlor with comfortable tufted seating, a four-seat dining nook, and direct access to an oversized garden terrace.',
                    'A master bedroom with king bedding connects seamlessly to a second bedroom with twin beds, complemented by two full ensuite bathrooms for maximum comfort and privacy.',
                ],
                'nightly_rate_php' => 11800.00,
                'total_inventory' => 2,
                'max_guests' => 4,
                'adults_capacity' => 4,
                'children_capacity' => 2,
                'bed_configuration' => '1 King Bed + 2 Twin Beds',
                'size_sqm' => 78,
                'view' => 'Garden & Pool View',
                'amenities' => [
                    'Separate living and dining parlor',
                    'Two full ensuite bathrooms',
                    'Spacious covered terrace',
                    'Mini refrigerator & refreshment bar',
                    'Two smart HD TVs',
                    'High-speed Wi-Fi',
                    'Plush sofa bed for additional comfort',
                    'Family game set & books',
                ],
                'featured_image' => [
                    'src' => 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80',
                    'alt' => 'Spacious suite with a tufted sofa in the lounge area and a bed beside tall curtained windows',
                    'source' => 'https://images.unsplash.com/photo-1590490360182-c33d57733427',
                ],
                'gallery' => [
                    [
                        'src' => 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80',
                        'alt' => 'Premium Family Suite living lounge with comfortable tufted sofas and dining area',
                        'source' => 'https://images.unsplash.com/photo-1590490360182-c33d57733427',
                    ],
                    [
                        'src' => 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1400&q=80',
                        'alt' => 'Master bedroom suite with glass-walled bathroom and panoramic garden views',
                        'source' => 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461',
                    ],
                    [
                        'src' => 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
                        'alt' => 'Relaxing poolside lounge chairs near the family suite pavilion',
                        'source' => 'https://images.unsplash.com/photo-1566073771259-6a8506099945',
                    ],
                ],
                'is_active' => true,
            ],
            [
                'slug' => 'private-pool-villa',
                'name' => 'Private Pool Villa',
                'category' => 'villa',
                'tagline' => 'Exclusive seclusion with your own private plunge pool and sun deck',
                'description' => 'A secluded villa with its own pool and terrace, offering complete privacy for an unforgettable stay.',
                'long_description' => [
                    'The pinnacle of the Golden Resort experience, the Private Pool Villa delivers uncompromised tranquility surrounded by secluded stone-walled garden courtyards.',
                    'Immerse yourself in your private freshwater plunge pool, bask on sun loungers upon the timber deck, or dine al fresco under the stars in your personal garden gazebo.',
                    'Indoors, soaring cathedral ceilings with exposed timber beams crown an open-concept living pavilion, state-of-the-art entertainment system, and an outdoor rain shower garden.',
                ],
                'nightly_rate_php' => 22500.00,
                'total_inventory' => 1,
                'max_guests' => 4,
                'adults_capacity' => 4,
                'children_capacity' => 2,
                'bed_configuration' => '1 King Master Suite + 1 Queen Bedroom',
                'size_sqm' => 120,
                'view' => 'Private Pool & Horizon Garden',
                'amenities' => [
                    'Private freshwater plunge pool',
                    'Sun lounger timber deck & gazebo',
                    'Outdoor tropical rain shower',
                    'Full ensuite with deep soaking stone tub',
                    'Personalized welcome refreshments',
                    'Espresso machine & gourmet bar',
                    'Complimentary high-speed premium Wi-Fi',
                    'Dedicated resort concierge liaison',
                ],
                'featured_image' => [
                    'src' => 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1400&q=80',
                    'alt' => 'Modern white two-story villa with a private swimming pool and lawn',
                    'source' => 'https://images.unsplash.com/photo-1613977257363-707ba9348227',
                ],
                'gallery' => [
                    [
                        'src' => 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1400&q=80',
                        'alt' => 'Villa exterior featuring a private swimming pool, sun terrace, and modern architecture',
                        'source' => 'https://images.unsplash.com/photo-1613977257363-707ba9348227',
                    ],
                    [
                        'src' => 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=1400&q=80',
                        'alt' => 'Open-air villa bedroom with sweeping views of the private terrace and pool',
                        'source' => 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1',
                    ],
                    [
                        'src' => 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1400&q=80',
                        'alt' => 'Private poolside sun deck bordered by lush tropical greenery',
                        'source' => 'https://images.unsplash.com/photo-1540541338287-41700207dee6',
                    ],
                ],
                'is_active' => true,
            ],
        ];

        foreach ($rooms as $roomData) {
            Room::updateOrCreate(
                ['slug' => $roomData['slug']],
                $roomData
            );
        }
    }
}
