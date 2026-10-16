import type {
  AvailabilitySearchParams,
  BookingCalculation,
  GuestInfo,
  RoomDetail,
} from "@/types/booking";

/**
 * Parses a YYYY-MM-DD string into a Date object representing the local calendar date.
 * Explicitly parses [year, month, day] to eliminate timezone offset bugs.
 */
export function parseLocalDate(str: string): Date {
  const parts = str.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return new Date(NaN);
  }
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
}

/**
 * Formats a Date object into a YYYY-MM-DD string using local calendar time.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD in the user's local timezone.
 */
export function getTodayLocalDateString(): string {
  return formatLocalDate(new Date());
}

/**
 * Returns the default check-in date: today's local date.
 */
export function getDefaultCheckInDate(): string {
  return getTodayLocalDateString();
}

/**
 * Returns the default check-out date: check-in date + 1 day.
 */
export function getDefaultCheckOutDate(checkInStr?: string): string {
  const checkIn = checkInStr ? parseLocalDate(checkInStr) : new Date();
  if (isNaN(checkIn.getTime())) {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return formatLocalDate(today);
  }
  const nextDay = new Date(checkIn);
  nextDay.setDate(nextDay.getDate() + 1);
  return formatLocalDate(nextDay);
}

/**
 * Calculates whole calendar nights between check-in and check-out.
 * Returns 0 if check-out <= check-in or if either date is invalid.
 */
export function calculateNights(checkInStr: string, checkOutStr: string): number {
  const checkIn = parseLocalDate(checkInStr);
  const checkOut = parseLocalDate(checkOutStr);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    return 0;
  }

  // Calculate calendar difference using UTC midday to avoid DST transitions
  const utc1 = Date.UTC(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
  const utc2 = Date.UTC(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const nights = Math.round((utc2 - utc1) / msPerDay);

  return nights > 0 ? nights : 0;
}

/**
 * Calculates the exact subtotal using integer multiplication in PHP Pesos.
 * Prevents floating-point precision issues.
 */
export function calculateBookingPrice(
  nightlyRatePhp: number,
  nights: number
): BookingCalculation {
  const safeRate = Math.max(0, Math.round(nightlyRatePhp));
  const safeNights = Math.max(0, Math.round(nights));
  const subtotalPhp = safeRate * safeNights;

  return {
    nightlyRatePhp: safeRate,
    nights: safeNights,
    subtotalPhp,
  };
}

/**
 * Validates search / reservation dates and guest counts.
 */
export function validateAvailabilityParams(
  params: Partial<AvailabilitySearchParams>,
  room?: RoomDetail
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const todayStr = getTodayLocalDateString();

  if (!params.checkIn) {
    errors.checkIn = "Check-in date is required.";
  } else {
    const checkInDate = parseLocalDate(params.checkIn);
    if (isNaN(checkInDate.getTime())) {
      errors.checkIn = "Please enter a valid check-in date.";
    } else if (params.checkIn < todayStr) {
      errors.checkIn = "Check-in date cannot be in the past.";
    }
  }

  if (!params.checkOut) {
    errors.checkOut = "Check-out date is required.";
  } else {
    const checkOutDate = parseLocalDate(params.checkOut);
    if (isNaN(checkOutDate.getTime())) {
      errors.checkOut = "Please enter a valid check-out date.";
    } else if (params.checkIn && params.checkOut <= params.checkIn) {
      errors.checkOut = "Check-out must be at least one day after check-in.";
    }
  }

  const adults = Number(params.adults ?? 0);
  if (isNaN(adults) || adults < 1) {
    errors.adults = "At least 1 adult is required.";
  } else if (adults > 10) {
    errors.adults = "Maximum 10 adults per single booking.";
  }

  const children = Number(params.children ?? 0);
  if (isNaN(children) || children < 0) {
    errors.children = "Children cannot be negative.";
  } else if (children > 10) {
    errors.children = "Maximum 10 children per single booking.";
  }

  if (room && !errors.adults && !errors.children) {
    const totalGuests = adults + children;
    if (totalGuests > room.maxGuests) {
      errors.guests = `${room.name} accommodates up to ${room.maxGuests} guests (${totalGuests} selected).`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates guest contact information for booking submission.
 */
export function validateGuestInfo(guest: GuestInfo): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const name = guest.fullName?.trim() || "";
  if (!name) {
    errors.fullName = "Full name is required.";
  } else if (name.length < 2) {
    errors.fullName = "Please enter your full name (at least 2 letters).";
  }

  const email = guest.email?.trim() || "";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    errors.email = "Email address is required.";
  } else if (!emailRegex.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  const phone = guest.phone?.trim() || "";
  // Permits optional +, digits, spaces, parentheses, and hyphens; minimum 7 digits
  const digitCount = (phone.match(/\d/g) || []).length;
  const phonePattern = /^[\d\s+\-()]{7,25}$/;
  if (!phone) {
    errors.phone = "Phone number is required.";
  } else if (!phonePattern.test(phone) || digitCount < 7) {
    errors.phone = "Please enter a valid contact phone number (at least 7 digits).";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Formats a PHP currency amount for user display.
 */
export function formatPhp(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a YYYY-MM-DD date string for user-friendly display (e.g., "Oct 18, 2026").
 */
export function formatDisplayDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
