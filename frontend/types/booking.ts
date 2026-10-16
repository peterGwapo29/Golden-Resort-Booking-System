import type { ResortImage } from "@/data/resort";

export type RoomCategory = "all" | "room" | "suite" | "villa";

export interface RoomDetail {
  slug: string;
  name: string;
  category: "room" | "suite" | "villa";
  tagline: string;
  description: string;
  longDescription: string[];
  sampleRatePhp: number;
  maxGuests: number;
  adultsCapacity: number;
  childrenCapacity: number;
  bedConfiguration: string;
  sizeSqm: number;
  view: string;
  amenities: string[];
  featuredImage: ResortImage;
  gallery: ResortImage[];
}

export interface AvailabilitySearchParams {
  checkIn: string; // YYYY-MM-DD (local calendar date)
  checkOut: string; // YYYY-MM-DD (local calendar date)
  adults: number;
  children: number;
  roomSlug?: string;
  category?: RoomCategory;
}

export interface GuestInfo {
  fullName: string;
  email: string;
  phone: string;
  specialRequests?: string;
}

export interface BookingCalculation {
  nightlyRatePhp: number;
  nights: number;
  subtotalPhp: number;
}

export interface BookingSubmissionState {
  room: RoomDetail;
  params: AvailabilitySearchParams;
  calculation: BookingCalculation;
  guest: GuestInfo;
}
