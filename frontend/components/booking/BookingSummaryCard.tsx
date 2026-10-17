import Image from "next/image";
import type { RoomDetail, AvailabilitySearchParams } from "@/types/booking";
import {
  calculateNights,
  calculateBookingPrice,
  formatDisplayDate,
  formatPhp,
} from "@/lib/booking-utils";
import { CalendarIcon, InfoIcon, UsersIcon } from "@/components/ui/Icons";

interface BookingSummaryCardProps {
  room: RoomDetail;
  params: AvailabilitySearchParams;
}

export default function BookingSummaryCard({
  room,
  params,
}: BookingSummaryCardProps) {
  const nights = calculateNights(params.checkIn, params.checkOut);
  const calculation = calculateBookingPrice(room.sampleRatePhp, nights);

  return (
    <div className="rounded-2xl border border-forest/10 bg-white p-6 shadow-md lg:sticky lg:top-28">
      <h3 className="font-serif text-xl font-medium text-forest">
        Reservation Summary
      </h3>

      {/* Selected Room Snapshot */}
      <div className="mt-4 flex gap-4 border-b border-forest/10 pb-5">
        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-forest/10">
          <Image
            src={
              room.featuredImage?.src ||
              (room as any).featured_image?.src ||
              (room as any).image_url ||
              "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80"
            }
            alt={
              room.featuredImage?.alt ||
              (room as any).featured_image?.alt ||
              room.name
            }
            fill
            unoptimized
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (!target.dataset.failed) {
                target.dataset.failed = "true";
                target.src = "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80";
              }
            }}
            sizes="96px"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold tracking-wider text-gold uppercase">
            {room.category === "room"
              ? "Garden Room"
              : room.category === "suite"
              ? "Family Suite"
              : "Pool Villa"}
          </p>
          <h4 className="font-serif text-lg font-medium text-forest">
            {room.name}
          </h4>
          <p className="text-xs text-muted">
            {formatPhp(room.sampleRatePhp)} / night
          </p>
        </div>
      </div>

      {/* Stay Details */}
      <div className="mt-5 space-y-3.5 border-b border-forest/10 pb-5 text-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-muted">
            <CalendarIcon className="h-4 w-4 text-gold" />
            <span>Check-in:</span>
          </div>
          <span className="font-medium text-ink">
            {params.checkIn ? formatDisplayDate(params.checkIn) : "Not set"}
          </span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-muted">
            <CalendarIcon className="h-4 w-4 text-gold" />
            <span>Check-out:</span>
          </div>
          <span className="font-medium text-ink">
            {params.checkOut ? formatDisplayDate(params.checkOut) : "Not set"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted">Length of Stay:</span>
          <span className="font-medium text-ink">
            {nights} {nights === 1 ? "Night" : "Nights"}
          </span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-muted">
            <UsersIcon className="h-4 w-4 text-gold" />
            <span>Guests:</span>
          </div>
          <span className="font-medium text-ink">
            {params.adults} {params.adults === 1 ? "Adult" : "Adults"}
            {params.children > 0 &&
              `, ${params.children} ${params.children === 1 ? "Child" : "Children"}`}
          </span>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between text-sm text-ink/80">
          <span>
            {formatPhp(room.sampleRatePhp)} &times; {nights} {nights === 1 ? "night" : "nights"}
          </span>
          <span>{formatPhp(calculation.subtotalPhp)}</span>
        </div>

        <div className="flex items-baseline justify-between border-t border-forest/10 pt-4">
          <span className="font-serif text-lg font-semibold text-forest">
            Estimated Subtotal
          </span>
          <span className="font-serif text-2xl font-bold text-forest">
            {formatPhp(calculation.subtotalPhp)}
          </span>
        </div>
      </div>

      {/* Demonstration Notice */}
      <div className="mt-6 flex items-start gap-2.5 rounded-lg bg-ivory p-3.5 text-xs text-muted">
        <InfoIcon className="h-4 w-4 shrink-0 text-gold" />
        <p>
          Sample demonstration pricing only. No credit card or payment is
          required during this phase.
        </p>
      </div>
    </div>
  );
}
