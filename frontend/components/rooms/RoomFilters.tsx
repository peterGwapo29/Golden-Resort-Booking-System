"use client";

import type { RoomCategory } from "@/types/booking";

interface RoomFiltersProps {
  selectedCategory: RoomCategory;
  onCategoryChange: (category: RoomCategory) => void;
  minGuests: number;
  onMinGuestsChange: (guests: number) => void;
  totalCount: number;
  filteredCount: number;
  onReset: () => void;
}

export default function RoomFilters({
  selectedCategory,
  onCategoryChange,
  minGuests,
  onMinGuestsChange,
  totalCount,
  filteredCount,
  onReset,
}: RoomFiltersProps) {
  const categories: { label: string; value: RoomCategory }[] = [
    { label: "All Accommodations", value: "all" },
    { label: "Garden Rooms", value: "room" },
    { label: "Family Suites", value: "suite" },
    { label: "Pool Villas", value: "villa" },
  ];

  const hasActiveFilters = selectedCategory !== "all" || minGuests > 0;

  return (
    <div className="flex flex-col gap-5 border-b border-forest/10 pb-6 md:flex-row md:items-center md:justify-between">
      {/* Category Pills */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Room categories">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onCategoryChange(cat.value)}
              className={`rounded-full px-4 py-2 text-xs font-medium tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-gold sm:text-sm ${
                isSelected
                  ? "bg-forest text-white shadow-sm"
                  : "bg-white text-ink/75 hover:bg-forest/5 hover:text-forest"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Guest Count & Reset */}
      <div className="flex items-center gap-3 self-end sm:self-auto">
        <label htmlFor="filter-capacity" className="text-xs font-medium text-muted">
          Capacity:
        </label>
        <select
          id="filter-capacity"
          value={minGuests}
          onChange={(e) => onMinGuestsChange(Number(e.target.value))}
          className="rounded-lg border border-forest/20 bg-white px-3 py-1.5 text-xs font-medium text-ink focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold sm:text-sm"
        >
          <option value={0}>Any Guests</option>
          <option value={2}>2+ Guests</option>
          <option value={4}>4+ Guests</option>
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-medium text-gold hover:underline focus-visible:outline-2 focus-visible:outline-gold"
          >
            Reset
          </button>
        )}

        <span className="text-xs text-muted">
          Showing {filteredCount} of {totalCount}
        </span>
      </div>
    </div>
  );
}
