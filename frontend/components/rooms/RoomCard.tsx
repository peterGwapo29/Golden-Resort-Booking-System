import Image from "next/image";
import Link from "next/link";
import type { RoomDetail } from "@/types/booking";
import { formatPhp } from "@/lib/booking-utils";
import {
  ArrowRightIcon,
  BedIcon,
  CheckIcon,
  UsersIcon,
} from "@/components/ui/Icons";

interface RoomCardProps {
  room: RoomDetail;
  searchQuery?: string; // Query string to preserve check-in/out & guest selections
}

export default function RoomCard({ room, searchQuery = "" }: RoomCardProps) {
  const detailHref = `/rooms/${room.slug}${searchQuery ? `?${searchQuery}` : ""}`;
  const bookHref = `/booking?room=${room.slug}${searchQuery ? `&${searchQuery}` : ""}`;

  const categoryLabel: Record<RoomDetail["category"], string> = {
    room: "Garden Room",
    suite: "Family Suite",
    villa: "Pool Villa",
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-forest/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Featured Photo */}
      <div className="relative aspect-[16/10] overflow-hidden bg-forest/10">
        <Image
          src={room.featuredImage.src}
          alt={room.featuredImage.alt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-4 left-4">
          <span className="rounded-full bg-forest-dark/85 px-3 py-1 text-xs font-medium tracking-wider text-gold uppercase backdrop-blur">
            {categoryLabel[room.category]}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <UsersIcon className="h-4 w-4 text-gold" />
            Up to {room.maxGuests} Guests
          </span>
          <span className="h-3 w-px bg-forest/20" />
          <span className="flex items-center gap-1.5">
            <BedIcon className="h-4 w-4 text-gold" />
            {room.sizeSqm} m²
          </span>
        </div>

        <h3 className="mt-3 font-serif text-2xl font-medium text-forest transition-colors group-hover:text-gold sm:text-3xl">
          <Link href={detailHref} className="focus-visible:outline-none focus-visible:underline">
            {room.name}
          </Link>
        </h3>

        <p className="mt-3 text-sm leading-relaxed text-muted">
          {room.description}
        </p>

        {/* Key Amenities Snippet */}
        <div className="mt-5 border-t border-forest/10 pt-4">
          <p className="text-xs font-semibold tracking-wider text-forest uppercase">
            Highlights
          </p>
          <ul className="mt-2.5 space-y-1.5 text-xs text-ink/80">
            {room.amenities.slice(0, 3).map((amenity) => (
              <li key={amenity} className="flex items-center gap-2">
                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-gold" />
                <span>{amenity}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing & Actions */}
        <div className="mt-6 flex flex-col gap-4 border-t border-forest/10 pt-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs text-muted">From</span>
            <div className="font-serif text-2xl font-semibold text-forest">
              {formatPhp(room.sampleRatePhp)}
              <span className="text-xs font-sans font-normal text-muted"> / night</span>
            </div>
            <span className="mt-0.5 block text-[0.68rem] tracking-wider text-gold uppercase">
              Sample demonstration rate
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={detailHref}
              aria-label={`View details for ${room.name}`}
              className="inline-flex items-center justify-center rounded-lg border border-forest/30 px-3.5 py-2 text-xs font-medium text-forest transition-colors hover:bg-forest/5 focus-visible:outline-2 focus-visible:outline-gold sm:text-sm"
            >
              Details
            </Link>
            <Link
              href={bookHref}
              aria-label={`Book ${room.name}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-xs font-medium tracking-wide text-forest-dark transition-colors hover:bg-gold/90 focus-visible:outline-2 focus-visible:outline-gold sm:text-sm"
            >
              Book Room
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
