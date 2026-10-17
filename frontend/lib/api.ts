import type {
  AvailabilitySearchParams,
  RoomCategory,
  RoomDetail,
} from "@/types/booking";
import { sampleRooms } from "@/data/rooms";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export interface CreateReservationPayload {
  room_slug: string;
  check_in: string;
  check_out: string;
  adults: number;
  children?: number;
  guest_full_name: string;
  guest_email: string;
  guest_phone: string;
  special_requests?: string;
}

export interface ReservationData {
  booking_reference: string;
  status: string;
  room: {
    id: number;
    slug: string;
    name: string;
    category: string;
    nightly_rate_php: number;
  };
  guest: {
    full_name: string;
    email: string;
    phone: string;
  };
  stay: {
    check_in: string;
    check_out: string;
    nights: number;
    adults: number;
    children: number;
    total_guests: number;
  };
  pricing: {
    nightly_rate_php: number;
    total_price_php: number;
    currency: string;
  };
  special_requests?: string;
  created_at: string;
}

export interface AvailabilityResult {
  available_rooms: (RoomDetail & {
    available_units: number;
    nights: number;
    calculated_total_php: number;
  })[];
  search: {
    check_in: string;
    check_out: string;
    nights: number;
    adults: number;
    children: number;
    total_guests: number;
    count: number;
  };
}

/**
 * Fetch all active rooms with optional category and guest count filters.
 */
export async function getRooms(
  category?: RoomCategory,
  minGuests?: number
): Promise<RoomDetail[]> {
  try {
    const params = new URLSearchParams();
    if (category && category !== "all") {
      params.set("category", category);
    }
    if (minGuests && minGuests > 0) {
      params.set("min_guests", String(minGuests));
    }

    const res = await fetch(`${API_BASE_URL}/rooms?${params.toString()}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new ApiError(`Failed to fetch rooms: ${res.statusText}`, res.status);
    }

    const data = await res.json();
    return data.data;
  } catch (err) {
    if (process.env.NODE_ENV === "development" || typeof window === "undefined") {
      console.warn("API request failed, using sample rooms fallback:", err);
      return sampleRooms.filter((r) => {
        if (category && category !== "all" && r.category !== category) return false;
        if (minGuests && minGuests > 0 && r.maxGuests < minGuests) return false;
        return true;
      });
    }
    throw err;
  }
}

/**
 * Fetch details for a single accommodation by slug.
 */
export async function getRoomBySlug(slug: string): Promise<RoomDetail | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/rooms/${slug}`, {
      cache: "no-store",
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new ApiError(`Failed to fetch room: ${res.statusText}`, res.status);
    }

    const data = await res.json();
    return data.data;
  } catch (err) {
    if (process.env.NODE_ENV === "development" || typeof window === "undefined") {
      console.warn("API room request failed, using sample fallback:", err);
      return sampleRooms.find((r) => r.slug === slug) || null;
    }
    throw err;
  }
}

/**
 * Check real accommodation availability for specified dates and party size.
 */
export async function checkAvailability(
  search: AvailabilitySearchParams
): Promise<AvailabilityResult> {
  const params = new URLSearchParams({
    check_in: search.checkIn,
    check_out: search.checkOut,
    adults: String(search.adults),
    children: String(search.children || 0),
  });

  if (search.category && search.category !== "all") {
    params.set("category", search.category);
  }
  if (search.roomSlug) {
    params.set("room_slug", search.roomSlug);
  }

  const res = await fetch(`${API_BASE_URL}/availability?${params.toString()}`, {
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      body.message || "Availability check failed.",
      res.status,
      body.errors
    );
  }

  return body as AvailabilityResult;
}

/**
 * Create and persist a real reservation with server-side validation and pricing.
 */
export async function createReservation(
  payload: CreateReservationPayload
): Promise<ReservationData> {
  const res = await fetch(`${API_BASE_URL}/reservations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      body.message || "Failed to create reservation.",
      res.status,
      body.errors
    );
  }

  return body.data as ReservationData;
}

/**
 * Retrieve an existing reservation with booking reference and guest email verification.
 */
export async function getReservation(
  reference: string,
  email: string
): Promise<ReservationData> {
  const params = new URLSearchParams({ email });
  const res = await fetch(
    `${API_BASE_URL}/reservations/${reference}?${params.toString()}`,
    {
      cache: "no-store",
    }
  );

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      body.message || "Reservation not found.",
      res.status,
      body.errors
    );
  }

  return body.data as ReservationData;
}
