import Image from "next/image";
import Link from "next/link";
import type { RoomDetail } from "@/types/booking";
import { formatPhp } from "@/lib/booking-utils";
import {
  AreaIcon,
  ArrowRightIcon,
  BedIcon,
  CheckIcon,
  UsersIcon,
} from "@/components/ui/Icons";

export interface RoomAvailabilityInfo {
  availableUnits: number;
  nights: number;
  calculatedTotalPhp: number;
}

interface RoomCardProps {
  room: RoomDetail;
  searchQuery?: string; // Query string to preserve check-in/out & guest selections
  availability?: RoomAvailabilityInfo | null;
  isDateSearchActive?: boolean;
}

export default function RoomCard({
  room,
  searchQuery = "",
  availability,
  isDateSearchActive = false,
}: RoomCardProps) {
  const detailHref = `/rooms/${room.slug}${searchQuery ? `?${searchQuery}` : ""}`;
  const bookHref = `/booking?room=${room.slug}${searchQuery ? `&${searchQuery}` : ""}`;

  const categoryLabel: Record<RoomDetail["category"], string> = {
    room: "Garden Room",
    suite: "Family Suite",
    villa: "Pool Villa",
  };

  const fallbackSrc =
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80";
  const imageSrc =
    room.featuredImage?.src ||
    (room as any).featured_image?.src ||
    (room as any).image_url ||
    fallbackSrc;
  const imageAlt =
    room.featuredImage?.alt ||
    (room as any).featured_image?.alt ||
    room.name;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-forest/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Featured Photo */}
      <div className="relative aspect-[16/10] overflow-hidden bg-forest/10">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          unoptimized
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            if (!target.dataset.failed) {
              target.dataset.failed = "true";
              target.src = fallbackSrc;
            }
          }}
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-4 left-4 flex flex-col items-start gap-1.5">
          <span className="rounded-full bg-forest-dark/85 px-3 py-1 text-xs font-medium tracking-wider text-gold uppercase backdrop-blur shadow-sm">
            {categoryLabel[room.category] || "Accommodation"}
          </span>
          {availability && (
            <span className="rounded-full bg-forest/90 px-2.5 py-0.5 text-[0.68rem] font-semibold tracking-wider text-white uppercase backdrop-blur shadow-sm">
              Available • {availability.availableUnits} Left
            </span>
          )}
          {isDateSearchActive && !availability && (
            <span className="rounded-full bg-red-950/85 px-2.5 py-0.5 text-[0.68rem] font-semibold tracking-wider text-red-200 uppercase backdrop-blur shadow-sm">
              Unavailable for Dates
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        {/* Specifications Strip */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-muted">
          <span className="flex items-center gap-1.5" title="Maximum Capacity">
            <UsersIcon className="h-4 w-4 shrink-0 text-gold" />
            <span>Up to {room.maxGuests} Guests</span>
          </span>
          <span className="h-3 w-px bg-forest/20" aria-hidden="true" />
          <span className="flex items-center gap-1.5" title="Bed Configuration">
            <BedIcon className="h-4 w-4 shrink-0 text-gold" />
            <span className="max-w-[130px] truncate">{room.bedConfiguration || "1 King Bed"}</span>
          </span>
          <span className="h-3 w-px bg-forest/20" aria-hidden="true" />
          <span className="flex items-center gap-1.5" title="Floor Area">
            <AreaIcon className="h-4 w-4 shrink-0 text-gold" />
            <span>{room.sizeSqm} m²</span>
          </span>
        </div>

        <h3 className="mt-3 font-serif text-2xl font-medium text-forest transition-colors group-hover:text-gold sm:text-3xl">
          <Link href={detailHref} className="focus-visible:outline-none focus-visible:underline">
            {room.name}
          </Link>
        </h3>

        <p className="mt-3 text-sm leading-relaxed text-muted line-clamp-3">
          {room.description}
        </p>

        {/* Key Amenities Snippet */}
        <div className="mt-5 border-t border-forest/10 pt-4">
          <p className="text-xs font-semibold tracking-wider text-forest uppercase">
            Highlights
          </p>
          <ul className="mt-2.5 space-y-1.5 text-xs text-ink/80">
            {(room.amenities || []).slice(0, 3).map((amenity) => (
              <li key={amenity} className="flex items-center gap-2">
                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-gold" />
                <span className="truncate">{amenity}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing & Actions (Pinned to bottom of card) */}
        <div className="mt-auto flex flex-col gap-4 border-t border-forest/10 pt-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {availability ? (
              <>
                <span className="text-xs font-medium text-forest">
                  Stay Total ({availability.nights} {availability.nights === 1 ? "night" : "nights"})
                </span>
                <div className="font-serif text-2xl font-semibold text-forest">
                  {formatPhp(availability.calculatedTotalPhp)}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                  <span>{formatPhp(room.sampleRatePhp)} / nt</span>
                  <span>•</span>
                  <span className="font-medium text-forest">
                    {availability.availableUnits} {availability.availableUnits === 1 ? "unit" : "units"} left
                  </span>
                </div>
              </>
            ) : isDateSearchActive ? (
              <>
                <span className="text-xs font-medium text-red-700">Selected Dates</span>
                <div className="font-serif text-xl font-medium text-ink/60">
                  Unavailable
                </div>
                <span className="mt-0.5 block text-[0.68rem] tracking-wider text-red-600 uppercase">
                  Fully Booked / Blocked
                </span>
              </>
            ) : (
              <>
                <span className="text-xs text-muted">From</span>
                <div className="font-serif text-2xl font-semibold text-forest">
                  {formatPhp(room.sampleRatePhp)}
                  <span className="text-xs font-sans font-normal text-muted"> / night</span>
                </div>
                <span className="mt-0.5 block text-[0.68rem] tracking-wider text-gold uppercase">
                  Sample demonstration rate
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href={detailHref}
              aria-label={`View details for ${room.name}`}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-forest/30 px-3.5 text-xs font-medium text-forest transition-colors hover:bg-forest/5 focus-visible:outline-2 focus-visible:outline-gold sm:text-sm"
            >
              Details
            </Link>
            {isDateSearchActive && !availability ? (
              <span
                aria-disabled="true"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-black/10 px-4 text-xs font-medium tracking-wide text-ink/40 cursor-not-allowed sm:text-sm"
                title="This accommodation is unavailable for the selected dates."
              >
                Unavailable
              </span>
            ) : (
              <Link
                href={bookHref}
                aria-label={`Book ${room.name}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-gold px-4 text-xs font-medium tracking-wide text-forest-dark transition-all hover:bg-gold/90 focus-visible:outline-2 focus-visible:outline-gold sm:text-sm shadow-sm"
              >
                <span>Book Room</span>
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

