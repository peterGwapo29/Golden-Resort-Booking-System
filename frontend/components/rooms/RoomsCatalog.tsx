"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { RoomCategory, AvailabilitySearchParams } from "@/types/booking";
import { sampleRooms } from "@/data/rooms";
import AvailabilitySearch from "@/components/booking/AvailabilitySearch";
import RoomFilters from "@/components/rooms/RoomFilters";
import RoomCard from "@/components/rooms/RoomCard";
export default function RoomsCatalog() {
  const searchParams = useSearchParams();

  // Read URL query parameters
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const adults = Number(searchParams.get("adults") || 2);
  const children = Number(searchParams.get("children") || 0);
  const initialCategory = (searchParams.get("category") as RoomCategory) || "all";

  const [category, setCategory] = useState<RoomCategory>(initialCategory);
  const [minGuests, setMinGuests] = useState<number>(0);

  // Search parameters to pass along to room detail and booking links
  const queryStr = useMemo(() => {
    const q = new URLSearchParams();
    if (checkIn) q.set("checkIn", checkIn);
    if (checkOut) q.set("checkOut", checkOut);
    if (adults) q.set("adults", String(adults));
    if (children) q.set("children", String(children));
    return q.toString();
  }, [checkIn, checkOut, adults, children]);

  // Filter logic
  const filteredRooms = useMemo(() => {
    return sampleRooms.filter((room) => {
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
  }, [category, minGuests]);

  const handleResetFilters = () => {
    setCategory("all");
    setMinGuests(0);
  };

  const initialSearchCriteria: Partial<AvailabilitySearchParams> = {
    checkIn,
    checkOut,
    adults,
    children,
  };

  return (
    <div className="space-y-12">
      {/* Availability Search Bar */}
      <AvailabilitySearch
        initialParams={initialSearchCriteria}
        className="-mt-14 relative z-20 mx-auto max-w-5xl"
      />

      {/* Filter Toolbar */}
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <RoomFilters
          selectedCategory={category}
          onCategoryChange={setCategory}
          minGuests={minGuests}
          onMinGuestsChange={setMinGuests}
          totalCount={sampleRooms.length}
          filteredCount={filteredRooms.length}
          onReset={handleResetFilters}
        />

        {/* Room Grid */}
        {filteredRooms.length > 0 ? (
          <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredRooms.map((room) => (
              <RoomCard key={room.slug} room={room} searchQuery={queryStr} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="my-16 rounded-2xl border border-forest/10 bg-white p-12 text-center shadow-sm">
            <h3 className="font-serif text-2xl font-medium text-forest">
              No Accommodations Match Your Selection
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted">
              We couldn&apos;t find any rooms fitting those specific filters. Try
              adjusting your guest count or resetting the category.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-6 inline-flex rounded-full bg-forest px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-forest-dark focus-visible:outline-2 focus-visible:outline-gold"
            >
              Reset All Filters
            </button>
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
