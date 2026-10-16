"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { BookingSubmissionState } from "@/types/booking";
import { formatDisplayDate, formatPhp } from "@/lib/booking-utils";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  InfoIcon,
  UsersIcon,
} from "@/components/ui/Icons";

interface BookingReviewProps {
  bookingData: BookingSubmissionState;
  onBack: () => void;
}

export default function BookingReview({
  bookingData,
  onBack,
}: BookingReviewProps) {
  const { room, params, calculation, guest } = bookingData;
  const [isConfirmedDemo, setIsConfirmedDemo] = useState(false);
  const [demoRef, setDemoRef] = useState("");

  const handleConfirm = () => {
    const code = Math.floor(1000 + Math.random() * 9000);
    setDemoRef(`DEMO-${room.slug.slice(0, 3).toUpperCase()}-${code}`);
    setIsConfirmedDemo(true);
  };

  if (isConfirmedDemo) {
    return (
      <div className="rounded-2xl border border-gold/30 bg-white p-8 text-center shadow-lg sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest text-gold">
          <CheckIcon className="h-8 w-8" />
        </div>

        <span className="mt-6 inline-block rounded-full bg-gold/20 px-4 py-1 text-xs font-semibold tracking-wider text-forest-dark uppercase">
          Demonstration Preview Completed
        </span>

        <h2 className="mt-4 font-serif text-3xl font-medium text-forest sm:text-4xl">
          Reservation Preview Received
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted">
          Thank you, <strong className="text-forest">{guest.fullName}</strong>.
          Your booking selections have been validated for demonstration.
        </p>

        {/* Clear Notice of No Real Transaction */}
        <div className="mx-auto mt-6 max-w-lg rounded-xl border border-forest/15 bg-ivory p-4 text-left text-xs leading-relaxed text-muted">
          <div className="flex items-start gap-2.5">
            <InfoIcon className="h-4 w-4 shrink-0 text-gold" />
            <div>
              <strong className="block font-medium text-forest">
                Important System Notice:
              </strong>
              This phase is a frontend demonstration. No backend reservation was
              created, no database records were saved, and no credit card was
              charged. Full reservation persistence and availability will be
              powered by the Laravel API in Phase 3.
            </div>
          </div>
        </div>

        {/* Summary Pill */}
        <div className="mx-auto mt-6 max-w-md rounded-lg border border-forest/10 bg-ivory/60 p-4 text-xs text-ink/80">
          <p>
            <strong>Sample Reference:</strong>{" "}
            <span className="font-mono text-forest">{demoRef}</span>
          </p>
          <p className="mt-1">
            <strong>Room:</strong> {room.name} ({calculation.nights}{" "}
            {calculation.nights === 1 ? "night" : "nights"})
          </p>
          <p className="mt-1">
            <strong>Sample Subtotal:</strong> {formatPhp(calculation.subtotalPhp)}
          </p>
        </div>

        {/* Navigation Actions */}
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/rooms"
            className="inline-flex items-center justify-center rounded-xl bg-forest px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-forest-dark focus-visible:outline-2 focus-visible:outline-gold"
          >
            Explore Other Accommodations
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-forest/30 bg-white px-6 py-3 text-sm font-medium text-forest transition-colors hover:bg-forest/5 focus-visible:outline-2 focus-visible:outline-gold"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Review Card */}
      <section className="rounded-2xl border border-forest/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between border-b border-forest/10 pb-5">
          <div>
            <h2 className="font-serif text-3xl font-medium text-forest">
              Review Your Reservation
            </h2>
            <p className="mt-1 text-sm text-muted">
              Please verify your stay details and contact information.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-forest/20 px-3.5 py-1.5 text-xs font-medium text-forest transition-colors hover:bg-forest/5 focus-visible:outline-2 focus-visible:outline-gold"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>

        {/* Room Snapshot */}
        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-forest/10 sm:w-48">
            <Image
              src={room.featuredImage.src}
              alt={room.featuredImage.alt}
              fill
              sizes="200px"
              className="object-cover"
            />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider text-gold uppercase">
              {room.category === "room"
                ? "Garden Room"
                : room.category === "suite"
                ? "Family Suite"
                : "Pool Villa"}
            </span>
            <h3 className="font-serif text-2xl font-medium text-forest">
              {room.name}
            </h3>
            <p className="mt-1 text-xs text-muted">
              {room.bedConfiguration} &bull; {room.view} &bull; {room.sizeSqm} m²
            </p>
            <p className="mt-2 text-sm font-semibold text-forest">
              {formatPhp(room.sampleRatePhp)}{" "}
              <span className="text-xs font-normal text-muted">/ night</span>
            </p>
          </div>
        </div>

        {/* Schedule & Guests */}
        <div className="mt-8 grid gap-4 rounded-xl border border-forest/10 bg-ivory/50 p-5 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <CalendarIcon className="h-4 w-4 text-gold" />
              <span>Check-in</span>
            </div>
            <p className="mt-1 font-medium text-ink">
              {formatDisplayDate(params.checkIn)}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <CalendarIcon className="h-4 w-4 text-gold" />
              <span>Check-out</span>
            </div>
            <p className="mt-1 font-medium text-ink">
              {formatDisplayDate(params.checkOut)}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <UsersIcon className="h-4 w-4 text-gold" />
              <span>Guests & Nights</span>
            </div>
            <p className="mt-1 font-medium text-ink">
              {params.adults} {params.adults === 1 ? "Adult" : "Adults"}
              {params.children > 0 && `, ${params.children} Child`}
              <span className="text-xs text-muted">
                {" "}
                ({calculation.nights} {calculation.nights === 1 ? "night" : "nights"})
              </span>
            </p>
          </div>
        </div>

        {/* Guest Details */}
        <div className="mt-8 border-t border-forest/10 pt-6">
          <h4 className="text-xs font-semibold tracking-wider text-forest uppercase">
            Guest Information
          </h4>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Full Name</dt>
              <dd className="mt-0.5 font-medium text-ink">{guest.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Email</dt>
              <dd className="mt-0.5 font-medium text-ink">{guest.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Phone</dt>
              <dd className="mt-0.5 font-medium text-ink">{guest.phone}</dd>
            </div>
            {guest.specialRequests && (
              <div className="sm:col-span-3">
                <dt className="text-xs text-muted">Special Requests</dt>
                <dd className="mt-0.5 text-sm text-ink/80 italic">
                  &ldquo;{guest.specialRequests}&rdquo;
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Price Breakdown */}
        <div className="mt-8 border-t border-forest/10 pt-6">
          <h4 className="text-xs font-semibold tracking-wider text-forest uppercase">
            Estimated Cost Breakdown
          </h4>
          <div className="mt-3 space-y-2 text-sm text-ink/80">
            <div className="flex justify-between">
              <span>
                {formatPhp(calculation.nightlyRatePhp)} &times; {calculation.nights}{" "}
                {calculation.nights === 1 ? "night" : "nights"}
              </span>
              <span>{formatPhp(calculation.subtotalPhp)}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-forest/10 pt-3 text-base font-semibold text-forest">
              <span>Subtotal (Sample)</span>
              <span className="text-xl">{formatPhp(calculation.subtotalPhp)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Confirmation Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-forest/30 bg-white px-6 py-3.5 text-sm font-medium text-forest transition-colors hover:bg-forest/5 focus-visible:outline-2 focus-visible:outline-gold"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Edit Information
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-8 py-4 text-sm font-medium tracking-wide text-forest-dark transition-colors hover:bg-gold/90 focus-visible:outline-2 focus-visible:outline-gold shadow-md"
        >
          Confirm Demonstration Preview
          <CheckIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
