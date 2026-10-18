"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AvailabilitySearchParams } from "@/types/booking";
import {
  getDefaultCheckOutDate,
  getTodayLocalDateString,
  validateAvailabilityParams,
} from "@/lib/booking-utils";
import { CalendarIcon, SearchIcon, SpinnerIcon, UsersIcon } from "@/components/ui/Icons";

interface AvailabilitySearchProps {
  initialParams?: Partial<AvailabilitySearchParams>;
  onSearch?: (params: AvailabilitySearchParams) => void;
  className?: string;
  roomSlug?: string;
  isSearching?: boolean;
}

export default function AvailabilitySearch({
  initialParams,
  onSearch,
  className = "",
  roomSlug,
  isSearching = false,
}: AvailabilitySearchProps) {
  const router = useRouter();
  const [todayStr] = useState<string>(() => getTodayLocalDateString());
  const [checkIn, setCheckIn] = useState<string>(
    () => initialParams?.checkIn || getTodayLocalDateString()
  );
  const [checkOut, setCheckOut] = useState<string>(
    () =>
      initialParams?.checkOut ||
      getDefaultCheckOutDate(initialParams?.checkIn || getTodayLocalDateString())
  );
  const [adults, setAdults] = useState<number>(initialParams?.adults ?? 2);
  const [children, setChildren] = useState<number>(initialParams?.children ?? 0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync state if initialParams change externally (e.g. navigation or reset)
  useEffect(() => {
    if (initialParams?.checkIn) {
      setCheckIn(initialParams.checkIn);
    }
    if (initialParams?.checkOut) {
      setCheckOut(initialParams.checkOut);
    }
    if (initialParams?.adults !== undefined) {
      setAdults(initialParams.adults);
    }
    if (initialParams?.children !== undefined) {
      setChildren(initialParams.children);
    }
  }, [
    initialParams?.checkIn,
    initialParams?.checkOut,
    initialParams?.adults,
    initialParams?.children,
  ]);

  const handleCheckInChange = (newCheckIn: string) => {
    setCheckIn(newCheckIn);
    // If checkout is before or equal to new checkin, automatically bump checkout to checkin + 1 day
    if (newCheckIn && (!checkOut || checkOut <= newCheckIn)) {
      setCheckOut(getDefaultCheckOutDate(newCheckIn));
    }
    if (errors.checkIn || errors.checkOut) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.checkIn;
        delete next.checkOut;
        return next;
      });
    }
  };

  const handleCheckOutChange = (newCheckOut: string) => {
    setCheckOut(newCheckOut);
    if (errors.checkOut) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.checkOut;
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSearching) {
      return;
    }

    const searchParams: AvailabilitySearchParams = {
      checkIn,
      checkOut,
      adults: Number(adults),
      children: Number(children),
      roomSlug,
    };

    const validation = validateAvailabilityParams(searchParams);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});

    if (onSearch) {
      onSearch(searchParams);
    } else {
      const query = new URLSearchParams({
        checkIn,
        checkOut,
        adults: String(adults),
        children: String(children),
      });
      if (roomSlug) query.set("room", roomSlug);
      router.push(`/rooms?${query.toString()}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`rounded-2xl border border-forest/10 bg-white p-5 shadow-lg lg:p-6 ${className}`}
      aria-label="Check room availability"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        {/* Check-in Date */}
        <div>
          <label
            htmlFor="search-check-in"
            className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-forest uppercase"
          >
            <CalendarIcon className="h-4 w-4 text-gold" />
            Check-In
          </label>
          <input
            id="search-check-in"
            type="date"
            min={todayStr}
            value={checkIn}
            onChange={(e) => handleCheckInChange(e.target.value)}
            disabled={isSearching}
            aria-invalid={!!errors.checkIn}
            aria-describedby={errors.checkIn ? "search-checkin-error" : undefined}
            className="mt-2 h-11 w-full rounded-lg border border-forest/20 bg-ivory/50 px-3.5 py-2 text-sm font-medium text-ink transition-colors focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold disabled:opacity-75"
          />
          {errors.checkIn && (
            <p id="search-checkin-error" className="mt-1 text-xs text-red-600 font-medium">
              {errors.checkIn}
            </p>
          )}
        </div>

        {/* Check-out Date */}
        <div>
          <label
            htmlFor="search-check-out"
            className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-forest uppercase"
          >
            <CalendarIcon className="h-4 w-4 text-gold" />
            Check-Out
          </label>
          <input
            id="search-check-out"
            type="date"
            min={checkIn ? getDefaultCheckOutDate(checkIn) : todayStr}
            value={checkOut}
            onChange={(e) => handleCheckOutChange(e.target.value)}
            disabled={isSearching}
            aria-invalid={!!errors.checkOut}
            aria-describedby={errors.checkOut ? "search-checkout-error" : undefined}
            className="mt-2 h-11 w-full rounded-lg border border-forest/20 bg-ivory/50 px-3.5 py-2 text-sm font-medium text-ink transition-colors focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold disabled:opacity-75"
          />
          {errors.checkOut && (
            <p id="search-checkout-error" className="mt-1 text-xs text-red-600 font-medium">
              {errors.checkOut}
            </p>
          )}
        </div>

        {/* Guests Group */}
        <div>
          <span className="flex items-center gap-1 text-xs font-semibold tracking-wider text-forest uppercase">
            <UsersIcon className="h-4 w-4 text-gold" />
            Guests
          </span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="search-adults" className="sr-only">
                Adults
              </label>
              <select
                id="search-adults"
                value={adults}
                disabled={isSearching}
                onChange={(e) => {
                  setAdults(Number(e.target.value));
                  if (errors.adults || errors.guests) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.adults;
                      delete next.guests;
                      return next;
                    });
                  }
                }}
                className="h-11 w-full rounded-lg border border-forest/20 bg-ivory/50 px-2.5 py-2 text-xs sm:text-sm font-medium text-ink transition-colors focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold disabled:opacity-75"
              >
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? "Adult" : "Adults"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="search-children" className="sr-only">
                Children
              </label>
              <select
                id="search-children"
                value={children}
                disabled={isSearching}
                onChange={(e) => {
                  setChildren(Number(e.target.value));
                  if (errors.children || errors.guests) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.children;
                      delete next.guests;
                      return next;
                    });
                  }
                }}
                className="h-11 w-full rounded-lg border border-forest/20 bg-ivory/50 px-2.5 py-2 text-xs sm:text-sm font-medium text-ink transition-colors focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold disabled:opacity-75"
              >
                {[0, 1, 2, 3, 4].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? "Child" : "Children"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div>
          <span className="hidden lg:block text-xs font-semibold tracking-wider text-transparent select-none uppercase" aria-hidden="true">
            Action
          </span>
          <button
            type="submit"
            disabled={isSearching}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-forest px-6 text-sm font-medium tracking-wide text-white transition-all hover:bg-forest-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow"
          >
            {isSearching ? (
              <>
                <SpinnerIcon className="h-4 w-4" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <SearchIcon className="h-4 w-4 text-gold" />
                <span>Search Availability</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errors.guests && (
        <p className="mt-3 text-xs text-red-600 font-medium sm:text-sm">{errors.guests}</p>
      )}
    </form>
  );
}
