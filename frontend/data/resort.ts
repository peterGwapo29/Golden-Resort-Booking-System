/**
 * Golden Resort â€” landing page content.
 *
 * SAMPLE CONTENT: Every room, rate, amenity and description in this file is
 * demonstration data only. None of it is verified resort information.
 * Replace it with data from the Laravel API in a later phase; the exported
 * types are intended to mirror future API resources.
 *
 * IMAGES: All photographs are hot-linked from Unsplash (https://unsplash.com,
 * Unsplash License) via images.unsplash.com, which is allow-listed in
 * next.config.ts. Remote links are not guaranteed to remain available;
 * replace them with owned resort photography before launch.
 */

export const IS_SAMPLE_CONTENT = true;

export type NavLink = {
  label: string;
  href: `#${string}`;
};

export type ResortImage = {
  src: string;
  alt: string;
  /** Verified Unsplash CDN origin URL, for attribution and replacement tracking. */
  source: string;
};

export type Room = {
  slug: string;
  name: string;
  description: string;
  /** Sample nightly rate in PHP. Not a real price. */
  sampleRatePhp: number;
  guests: string;
  /** Target for "View Details". Points to #book until room pages exist. */
  href: string;
  image: ResortImage;
};

export type AmenityIcon = "pool" | "dining" | "garden" | "family";

export type Amenity = {
  title: string;
  description: string;
  icon: AmenityIcon;
};

export type GalleryImage = ResortImage & {
  /** Layout hint for the asymmetric gallery grid. */
  span: "tall" | "wide" | "regular";
};

/** Builds a sized Unsplash CDN URL from a photo ID. */
function unsplash(id: string, width: number): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;
}

export const siteConfig = {
  name: "Golden Resort",
  tagline: "Your Escape to Paradise",
  description:
    "A peaceful tropical hideaway where lush gardens, calm waters and warm hospitality come together for an unhurried getaway.",
  bookingHref: "#book",
  /** Editable placeholders. Do not replace with invented real details. */
  contact: {
    address: "Resort address to be confirmed",
    phone: "Phone number to be confirmed",
    email: "Email address to be confirmed",
  },
} as const;

export const navLinks: NavLink[] = [
  { label: "Home", href: "#home" },
  { label: "Rooms and Suites", href: "#rooms" },
  { label: "Amenities", href: "#amenities" },
  { label: "Gallery", href: "#gallery" },
  { label: "About Us", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export const heroImage: ResortImage = {
  src: unsplash("1520250497591-112f2f40a3f4", 2400),
  alt: "Turquoise resort swimming pool framed by palm trees and thatched-roof villas, with green mountains in the distance",
  source: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4",
};

export const introImage: ResortImage = {
  src: unsplash("1582719508461-905c673771fd", 1400),
  alt: "Wooden sun deck with loungers and parasols beside an infinity pool overlooking the sea",
  source: "https://images.unsplash.com/photo-1582719508461-905c673771fd",
};

export const bookingImage: ResortImage = {
  src: unsplash("1571896349842-33c89424de2d", 2400),
  alt: "Resort pool reflecting illuminated pavilions at dusk",
  source: "https://images.unsplash.com/photo-1571896349842-33c89424de2d",
};

export const featuredRooms: Room[] = [
  {
    slug: "deluxe-garden-room",
    name: "Deluxe Garden Room",
    description:
      "A warm, wood-accented retreat opening onto leafy garden views, ideal for couples seeking quiet comfort.",
    sampleRatePhp: 6500,
    guests: "Up to 2 guests",
    href: "#book",
    image: {
      src: unsplash("1611892440504-42a792e24d32", 1200),
      alt: "Wood-paneled bedroom with a large bed and windows looking out onto tropical garden greenery",
      source: "https://images.unsplash.com/photo-1611892440504-42a792e24d32",
    },
  },
  {
    slug: "premium-family-suite",
    name: "Premium Family Suite",
    description:
      "Generous living space with a separate lounge area, designed so the whole family can unwind together.",
    sampleRatePhp: 11800,
    guests: "Up to 4 guests",
    href: "#book",
    image: {
      src: unsplash("1590490360182-c33d57733427", 1200),
      alt: "Spacious suite with a tufted sofa in the lounge area and a bed beside tall curtained windows",
      source: "https://images.unsplash.com/photo-1590490360182-c33d57733427",
    },
  },
  {
    slug: "private-pool-villa",
    name: "Private Pool Villa",
    description:
      "A secluded villa with its own pool and terrace, offering complete privacy for an unforgettable stay.",
    sampleRatePhp: 22500,
    guests: "Up to 4 guests",
    href: "#book",
    image: {
      src: unsplash("1613977257363-707ba9348227", 1200),
      alt: "Modern white two-story villa with a private swimming pool and lawn",
      source: "https://images.unsplash.com/photo-1613977257363-707ba9348227",
    },
  },
];

export const amenities: Amenity[] = [
  {
    title: "Swimming Pool",
    description:
      "Unwind poolside with loungers, shade and calm water for an easy afternoon swim.",
    icon: "pool",
  },
  {
    title: "Restaurant and Dining",
    description:
      "Enjoy relaxed meals inspired by local flavors, from slow breakfasts to candlelit dinners.",
    icon: "dining",
  },
  {
    title: "Garden and Nature",
    description:
      "Wander through landscaped tropical gardens and quiet green corners made for slowing down.",
    icon: "garden",
  },
  {
    title: "Family Recreation",
    description:
      "Shared spaces and gentle activities that keep guests of every age happily entertained.",
    icon: "family",
  },
];

export const galleryImages: GalleryImage[] = [
  {
    src: unsplash("1540541338287-41700207dee6", 1400),
    alt: "Aerial view of a winding infinity pool lined with palm trees and white parasols beside the ocean",
    source: "https://images.unsplash.com/photo-1540541338287-41700207dee6",
    span: "tall",
  },
  {
    src: unsplash("1414235077428-338989a2e8c0", 1000),
    alt: "Plated dish served on a restaurant table set with wine glasses",
    source: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0",
    span: "regular",
  },
  {
    src: unsplash("1566073771259-6a8506099945", 1000),
    alt: "Lounge chairs on a wooden deck beside a pool and a timber-roofed lodge",
    source: "https://images.unsplash.com/photo-1566073771259-6a8506099945",
    span: "regular",
  },
  {
    src: unsplash("1584132967334-10e028bd69f7", 1400),
    alt: "Palm trees shading a wooden pool deck with sun loungers facing the sea",
    source: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7",
    span: "wide",
  },
  {
    src: unsplash("1505881502353-a1986add3762", 1000),
    alt: "Wooden boardwalk stretching across clear turquoise water toward a small palm-covered island",
    source: "https://images.unsplash.com/photo-1505881502353-a1986add3762",
    span: "regular",
  },
  {
    src: unsplash("1507525428034-b723cf961d3e", 1000),
    alt: "Gentle waves rolling onto a sandy shore under a golden sunset",
    source: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
    span: "regular",
  },
];

/** Formats a sample PHP rate for display, e.g. "â‚±6,500". */
export function formatPhp(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}
