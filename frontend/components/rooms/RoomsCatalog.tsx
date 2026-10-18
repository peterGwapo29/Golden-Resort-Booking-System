"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  RoomCategory,
  AvailabilitySearchParams,
  RoomDetail,
} from "@/types/booking";
import { sampleRooms } from "@/data/rooms";
import { checkAvailability, getRooms } from "@/lib/api";
import { calculateNights, formatDisplayDate } from "@/lib/booking-utils";
import AvailabilitySearch from "@/components/booking/AvailabilitySearch";
import RoomFilters from "@/components/rooms/RoomFilters";
import RoomCard, { type RoomAvailabilityInfo } from "@/components/rooms/RoomCard";
import { CalendarIcon, CloseIcon, InfoIcon } from "@/components/ui/Icons";

export default function RoomsCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL query parameters
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const adults = Number(searchParams.get("adults") || 2);
  const children = Number(searchParams.get("children") || 0);
  const urlCategory = (searchParams.get("category") as RoomCategory) || "all";

  const [category, setCategory] = useState<RoomCategory>(urlCategory);
  const [minGuests, setMinGuests] = useState<number>(0);
  const [rooms, setRooms] = useState<RoomDetail[]>(sampleRooms);
  const [availabilityMap, setAvailabilityMap] = useState<
    Map<string, RoomAvailabilityInfo>
  >(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isDateSearchActive = Boolean(checkIn && checkOut && checkOut > checkIn);
  const nightsCount = isDateSearchActive ? calculateNights(checkIn, checkOut) : 0;
  const totalGuests = adults + children;

  // Sync category state when URL changes
  useEffect(() => {
    if (urlCategory) {
      setCategory(urlCategory);
    }
  }, [urlCategory]);

  // Load catalog rooms & check availability when date search is active
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setFetchError(null);

    const loadData = async () => {
      try {
        // Always ensure base room details are loaded
        const allRoomsPromise = getRooms().catch((err) => {
          console.warn("Could not load accommodations catalog:", err);
          return sampleRooms;
        });

        if (isDateSearchActive) {
          setIsSearching(true);
          const [catalogRooms, availabilityResult] = await Promise.all([
            allRoomsPromise,
            checkAvailability({
              checkIn,
              checkOut,
              adults,
              children,
              category: category !== "all" ? category : undefined,
            }).catch((err) => {
              console.warn("Availability API check failed:", err);
              return null;
            }),
          ]);

          if (!active) return;

          if (catalogRooms && catalogRooms.length > 0) {
            setRooms(catalogRooms);
          }

          const newMap = new Map<string, RoomAvailabilityInfo>();
          if (availabilityResult && availabilityResult.available_rooms) {
            for (const item of availabilityResult.available_rooms) {
              newMap.set(item.slug, {
                availableUnits: item.available_units,
                nights: item.nights,
                calculatedTotalPhp: item.calculated_total_php,
              });
            }
          }
          setAvailabilityMap(newMap);
        } else {
          const catalogRooms = await allRoomsPromise;
          if (!active) return;

          if (catalogRooms && catalogRooms.length > 0) {
            setRooms(catalogRooms);
          }
          setAvailabilityMap(new Map());
        }
      } catch (err: any) {
        if (!active) return;
        setFetchError("Unable to load latest room availability. Showing catalog preview.");
        setRooms(sampleRooms);
      } finally {
        if (active) {
          setIsLoading(false);
          setIsSearching(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [checkIn, checkOut, adults, children, category, isDateSearchActive]);

  // Handle Search Submission
  const handlePerformSearch = (params: AvailabilitySearchParams) => {
    const q = new URLSearchParams();
    if (params.checkIn) q.set("checkIn", params.checkIn);
    if (params.checkOut) q.set("checkOut", params.checkOut);
    if (params.adults) q.set("adults", String(params.adults));
    if (params.children) q.set("children", String(params.children));
    if (category !== "all") q.set("category", category);

    router.push(`/rooms?${q.toString()}`);
  };

  // Clear active dates filter
  const handleClearDates = () => {
    const q = new URLSearchParams();
    if (category !== "all") q.set("category", category);
    router.push(q.toString() ? `/rooms?${q.toString()}` : "/rooms");
  };

  // Category filter selection handler
  const handleCategoryChange = (newCat: RoomCategory) => {
    setCategory(newCat);
    const q = new URLSearchParams();
    if (checkIn) q.set("checkIn", checkIn);
    if (checkOut) q.set("checkOut", checkOut);
    if (adults) q.set("adults", String(adults));
    if (children) q.set("children", String(children));
    if (newCat !== "all") q.set("category", newCat);

    router.push(q.toString() ? `/rooms?${q.toString()}` : "/rooms");
  };

  // Reset all filters and search parameters
  const handleResetFilters = () => {
    setCategory("all");
    setMinGuests(0);
    router.push("/rooms");
  };

  // Search parameters to pass along to room detail and booking links
  const queryStr = useMemo(() => {
    const q = new URLSearchParams();
    if (checkIn) q.set("checkIn", checkIn);
    if (checkOut) q.set("checkOut", checkOut);
    if (adults) q.set("adults", String(adults));
    if (children) q.set("children", String(children));
    return q.toString();
  }, [checkIn, checkOut, adults, children]);

  // Filter and sort rooms
  const filteredRooms = useMemo(() => {
    const result = rooms.filter((room) => {
      // Category filter
      if (category !== "all" && room.category !== category) {
        return false;
      }
      // Capacity filter
      if (minGuests > 0 && room.maxGuests < minGuests) {
        return false;
      }
      return true;
    });

    // If date search is active, sort available units first
    if (isDateSearchActive && availabilityMap.size > 0) {
      return [...result].sort((a, b) => {
        const aAvail = availabilityMap.has(a.slug) ? 1 : 0;
        const bAvail = availabilityMap.has(b.slug) ? 1 : 0;
        return bAvail - aAvail;
      });
    }

    return result;
  }, [rooms, category, minGuests, isDateSearchActive, availabilityMap]);

  const initialSearchCriteria: Partial<AvailabilitySearchParams> = {
    checkIn,
    checkOut,
    adults,
    children,
  };

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Availability Search Bar */}
      <AvailabilitySearch
        initialParams={initialSearchCriteria}
        onSearch={handlePerformSearch}
        isSearching={isSearching}
        className="-mt-10 sm:-mt-14 relative z-20 mx-auto max-w-5xl"
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Active Search Summary Banner */}
        {isDateSearchActive && (
          <div className="mb-8 flex flex-col items-start justify-between gap-3 rounded-xl border border-gold/40 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
                <CalendarIcon className="h-5 w-5 text-forest" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold tracking-wider text-forest uppercase">
                    Stay Schedule
                  </span>
                  <span className="rounded bg-forest/10 px-2 py-0.5 text-[0.7rem] font-medium text-forest">
                    {nightsCount} {nightsCount === 1 ? "Night" : "Nights"}
                  </span>
                  <span className="rounded bg-forest/10 px-2 py-0.5 text-[0.7rem] font-medium text-forest">
                    {totalGuests} {totalGuests === 1 ? "Guest" : "Guests"}
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-medium text-forest">
                  {formatDisplayDate(checkIn)} &mdash; {formatDisplayDate(checkOut)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearDates}
              className="inline-flex items-center gap-1.5 rounded-lg border border-forest/20 px-3 py-1.5 text-xs font-medium text-forest transition-colors hover:bg-forest/5 focus-visible:outline-2 focus-visible:outline-gold"
            >
              <CloseIcon className="h-3.5 w-3.5 text-muted" />
              <span>Clear Dates &amp; View All</span>
            </button>
          </div>
        )}

        {/* Fetch Warning Banner (if any) */}
        {fetchError && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
            <InfoIcon className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{fetchError}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <RoomFilters
          selectedCategory={category}
          onCategoryChange={handleCategoryChange}
          minGuests={minGuests}
          onMinGuestsChange={setMinGuests}
          totalCount={rooms.length}
          filteredCount={filteredRooms.length}
          onReset={handleResetFilters}
        />

        {/* Loading Skeleton Grid */}
        {isLoading ? (
          <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="flex flex-col overflow-hidden rounded-xl border border-forest/10 bg-white shadow-sm animate-pulse"
              >
                <div className="aspect-[16/10] bg-forest/10" />
                <div className="flex flex-1 flex-col p-6 sm:p-7 space-y-4">
                  <div className="h-4 w-1/2 rounded bg-forest/10" />
                  <div className="h-7 w-3/4 rounded bg-forest/10" />
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded bg-forest/10" />
                    <div className="h-3 w-5/6 rounded bg-forest/10" />
                  </div>
                  <div className="mt-auto pt-6 border-t border-forest/10 flex justify-between items-end">
                    <div className="h-8 w-24 rounded bg-forest/10" />
                    <div className="h-10 w-28 rounded bg-forest/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRooms.length > 0 ? (
          /* Room Grid */
          <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredRooms.map((room) => {
              const availInfo = isDateSearchActive
                ? availabilityMap.get(room.slug) || null
                : null;

              return (
                <RoomCard
                  key={room.slug}
                  room={room}
                  searchQuery={queryStr}
                  availability={availInfo}
                  isDateSearchActive={isDateSearchActive}
                />
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="my-16 rounded-2xl border border-forest/10 bg-white p-10 text-center shadow-sm sm:p-14">
            <h3 className="font-serif text-2xl font-medium text-forest sm:text-3xl">
              {isDateSearchActive
                ? "No Accommodations Available for Selected Dates"
                : "No Accommodations Match Your Selection"}
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
              {isDateSearchActive
                ? "All rooms and suites in this category are reserved for the chosen date range. Please try adjusting your schedule or clearing the date filter."
                : "We couldn't find any rooms fitting those specific filters. Try adjusting your guest count or resetting your category."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {isDateSearchActive && (
                <button
                  type="button"
                  onClick={handleClearDates}
                  className="inline-flex rounded-full bg-forest px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-forest-dark focus-visible:outline-2 focus-visible:outline-gold"
                >
                  Clear Dates &amp; View All
                </button>
              )}
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex rounded-full border border-forest/30 px-6 py-2.5 text-sm font-medium text-forest transition-colors hover:bg-forest/5 focus-visible:outline-2 focus-visible:outline-gold"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}

        {/* Demonstration Disclaimer */}
        <p className="mt-12 text-center text-xs text-muted">
          All room rates and availability shown are sample demonstration content
          and do not reflect actual live bookings.
        </p>
      </div>
    </div>
  );
}
