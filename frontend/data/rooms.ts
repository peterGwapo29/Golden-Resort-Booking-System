import type { RoomDetail } from "@/types/booking";

function unsplash(id: string, width: number): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;
}

/**
 * DEMONSTRATION CONTENT ONLY:
 * All room details, pricing, capacities, and amenities in this file are sample
 * demonstration data and do not represent verified real-world resort facts.
 * In a future phase, this data will be loaded dynamically from the Laravel API.
 */
export const sampleRooms: RoomDetail[] = [
  {
    slug: "deluxe-garden-room",
    name: "Deluxe Garden Room",
    category: "room",
    tagline: "A peaceful sanctuary nestled among lush tropical flora",
    description:
      "A warm, wood-accented retreat opening onto leafy garden views, ideal for couples seeking quiet comfort.",
    longDescription: [
      "Nestled along the resort's quietest botanical path, the Deluxe Garden Room offers a restful refuge surrounded by exotic native palms and vibrant flowering shrubs.",
      "The interior pairs warm natural hardwoods with breathable ivory linens and handcrafted wicker accents. Step through sliding glass doors onto your private shaded veranda for morning coffee amidst gentle tropical breezes.",
      "Features a spa-inspired ensuite bathroom with a rainfall shower, organic local bath amenities, and thoughtful details designed for deep relaxation.",
    ],
    sampleRatePhp: 6500,
    maxGuests: 2,
    adultsCapacity: 2,
    childrenCapacity: 1,
    bedConfiguration: "1 King Bed or 2 Twin Beds",
    sizeSqm: 42,
    view: "Tropical Garden View",
    amenities: [
      "Private garden veranda",
      "Rainfall shower",
      "High-speed Wi-Fi",
      "Air conditioning",
      "Artisanal coffee & tea maker",
      "Smart HD TV with streaming",
      "Luxury bathrobes & organic toiletries",
      "In-room digital safe",
    ],
    featuredImage: {
      src: unsplash("1611892440504-42a792e24d32", 1400),
      alt: "Wood-paneled bedroom with a large bed and windows looking out onto tropical garden greenery",
      source: "https://images.unsplash.com/photo-1611892440504-42a792e24d32",
    },
    gallery: [
      {
        src: unsplash("1611892440504-42a792e24d32", 1400),
        alt: "Deluxe Garden Room king bed framed by warm wood paneling and natural sunlight",
        source: "https://images.unsplash.com/photo-1611892440504-42a792e24d32",
      },
      {
        src: unsplash("1618773928121-c32242e63f39", 1400),
        alt: "Detail of the elegant bedside table, reading lamp, and crisp white bed linens",
        source: "https://images.unsplash.com/photo-1618773928121-c32242e63f39",
      },
      {
        src: unsplash("1582719508461-905c673771fd", 1400),
        alt: "Private veranda patio seating area overlooking lush green gardens",
        source: "https://images.unsplash.com/photo-1582719508461-905c673771fd",
      },
    ],
  },
  {
    slug: "premium-family-suite",
    name: "Premium Family Suite",
    category: "suite",
    tagline: "Expansive multi-room living for shared family memories",
    description:
      "Generous living space with a separate lounge area, designed so the whole family can unwind together.",
    longDescription: [
      "Crafted specifically for traveling families and close-knit groups, the Premium Family Suite balances shared social spaces with private relaxation corners.",
      "The expansive floor plan includes a dedicated living parlor with comfortable tufted seating, a four-seat dining nook, and direct access to an oversized garden terrace.",
      "A master bedroom with king bedding connects seamlessly to a second bedroom with twin beds, complemented by two full ensuite bathrooms for maximum comfort and privacy.",
    ],
    sampleRatePhp: 11800,
    maxGuests: 4,
    adultsCapacity: 4,
    childrenCapacity: 2,
    bedConfiguration: "1 King Bed + 2 Twin Beds",
    sizeSqm: 78,
    view: "Garden & Pool View",
    amenities: [
      "Separate living and dining parlor",
      "Two full ensuite bathrooms",
      "Spacious covered terrace",
      "Mini refrigerator & refreshment bar",
      "Two smart HD TVs",
      "High-speed Wi-Fi",
      "Plush sofa bed for additional comfort",
      "Family game set & books",
    ],
    featuredImage: {
      src: unsplash("1590490360182-c33d57733427", 1400),
      alt: "Spacious suite with a tufted sofa in the lounge area and a bed beside tall curtained windows",
      source: "https://images.unsplash.com/photo-1590490360182-c33d57733427",
    },
    gallery: [
      {
        src: unsplash("1590490360182-c33d57733427", 1400),
        alt: "Premium Family Suite living lounge with comfortable tufted sofas and dining area",
        source: "https://images.unsplash.com/photo-1590490360182-c33d57733427",
      },
      {
        src: unsplash("1578683010236-d716f9a3f461", 1400),
        alt: "Master bedroom suite with glass-walled bathroom and panoramic garden views",
        source: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461",
      },
      {
        src: unsplash("1566073771259-6a8506099945", 1400),
        alt: "Relaxing poolside lounge chairs near the family suite pavilion",
        source: "https://images.unsplash.com/photo-1566073771259-6a8506099945",
      },
    ],
  },
  {
    slug: "private-pool-villa",
    name: "Private Pool Villa",
    category: "villa",
    tagline: "Exclusive seclusion with your own private plunge pool and sun deck",
    description:
      "A secluded villa with its own pool and terrace, offering complete privacy for an unforgettable stay.",
    longDescription: [
      "The pinnacle of the Golden Resort experience, the Private Pool Villa delivers uncompromised tranquility surrounded by secluded stone-walled garden courtyards.",
      "Immerse yourself in your private freshwater plunge pool, bask on sun loungers upon the timber deck, or dine al fresco under the stars in your personal garden gazebo.",
      "Indoors, soaring cathedral ceilings with exposed timber beams crown an open-concept living pavilion, state-of-the-art entertainment system, and an outdoor rain shower garden.",
    ],
    sampleRatePhp: 22500,
    maxGuests: 4,
    adultsCapacity: 4,
    childrenCapacity: 2,
    bedConfiguration: "1 King Master Suite + 1 Queen Bedroom",
    sizeSqm: 120,
    view: "Private Pool & Horizon Garden",
    amenities: [
      "Private freshwater plunge pool",
      "Sun lounger timber deck & gazebo",
      "Outdoor tropical rain shower",
      "Full ensuite with deep soaking stone tub",
      "Personalized welcome refreshments",
      "Espresso machine & gourmet bar",
      "Complimentary high-speed premium Wi-Fi",
      "Dedicated resort concierge liaison",
    ],
    featuredImage: {
      src: unsplash("1613977257363-707ba9348227", 1400),
      alt: "Modern white two-story villa with a private swimming pool and lawn",
      source: "https://images.unsplash.com/photo-1613977257363-707ba9348227",
    },
    gallery: [
      {
        src: unsplash("1613977257363-707ba9348227", 1400),
        alt: "Villa exterior featuring a private swimming pool, sun terrace, and modern architecture",
        source: "https://images.unsplash.com/photo-1613977257363-707ba9348227",
      },
      {
        src: unsplash("1602002418082-a4443e081dd1", 1400),
        alt: "Open-air villa bedroom with sweeping views of the private terrace and pool",
        source: "https://images.unsplash.com/photo-1602002418082-a4443e081dd1",
      },
      {
        src: unsplash("1540541338287-41700207dee6", 1400),
        alt: "Private poolside sun deck bordered by lush tropical greenery",
        source: "https://images.unsplash.com/photo-1540541338287-41700207dee6",
      },
    ],
  },
];

export function getRoomBySlug(slug: string): RoomDetail | undefined {
  return sampleRooms.find((room) => room.slug === slug);
}
