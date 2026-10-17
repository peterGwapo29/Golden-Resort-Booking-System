"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { BookingSubmissionState } from "@/types/booking";
import { formatDisplayDate, formatPhp } from "@/lib/booking-utils";
import { createReservation, type ReservationData, ApiError } from "@/lib/api";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedReservation, setConfirmedReservation] =
    useState<ReservationData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setIsConflict(false);

    try {
      const res = await createReservation({
        room_slug: room.slug,
        check_in: params.checkIn,
        check_out: params.checkOut,
        adults: params.adults,
        children: params.children,
        guest_full_name: guest.fullName,
        guest_email: guest.email,
        guest_phone: guest.phone,
        special_requests: guest.specialRequests,
      });

      setConfirmedReservation(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setIsConflict(true);
        setErrorMessage(
          err.message ||
            "The selected accommodation is no longer available for your chosen dates. Please choose alternate dates or select another room."
        );
      } else if (err instanceof ApiError && err.errors) {
        const firstErrorKey = Object.keys(err.errors)[0];
        setErrorMessage(err.errors[firstErrorKey]?.[0] || err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred while saving your reservation.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmedReservation) {
    const stay = confirmedReservation.stay;
    const pricing = confirmedReservation.pricing;

    return (
      <div className="rounded-2xl border border-gold/30 bg-white p-8 text-center shadow-lg sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest text-gold">
          <CheckIcon className="h-8 w-8" />
        </div>

        <span className="mt-6 inline-block rounded-full bg-gold/20 px-4 py-1 text-xs font-semibold tracking-wider text-forest-dark uppercase">
          Reservation Request Registered
        </span>

        <h2 className="mt-4 font-serif text-3xl font-medium text-forest sm:text-4xl">
          Reservation Confirmed
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted">
          Thank you, <strong className="text-forest">{confirmedReservation.guest.full_name}</strong>.
          Your reservation has been recorded in the Golden Resort system with status{" "}
          <span className="font-semibold uppercase tracking-wider text-forest">
            {confirmedReservation.status}
          </span>
          .
        </p>

        {/* Clear Notice */}
        <div className="mx-auto mt-6 max-w-lg rounded-xl border border-forest/15 bg-ivory p-4 text-left text-xs leading-relaxed text-muted">
          <div className="flex items-start gap-2.5">
            <InfoIcon className="h-4 w-4 shrink-0 text-gold" />
            <div>
              <strong className="block font-medium text-forest">
                Reservation Details:
              </strong>
              Your booking has been persisted to the resort database. Please keep
              your booking reference for check-in and inquiry purposes.
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="mx-auto mt-6 max-w-md space-y-2 rounded-lg border border-forest/10 bg-ivory/60 p-5 text-left text-xs text-ink/80">
          <div className="flex items-center justify-between border-b border-forest/10 pb-2">
            <span className="text-muted">Booking Reference:</span>
            <span className="font-mono text-sm font-bold text-forest">
              {confirmedReservation.booking_reference}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted">Accommodation:</span>
            <span className="font-medium text-forest">
              {confirmedReservation.room.name}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted">Stay Dates:</span>
            <span>
              {formatDisplayDate(stay.check_in)} &ndash;{" "}
              {formatDisplayDate(stay.check_out)} ({stay.nights}{" "}
              {stay.nights === 1 ? "night" : "nights"})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted">Guests:</span>
            <span>
              {stay.adults} Adults
              {stay.children > 0 && `, ${stay.children} Children`}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-forest/10 pt-2 font-semibold text-forest">
            <span>Total Amount:</span>
            <span className="text-base font-serif">
              {formatPhp(pricing.total_price_php)}
            </span>
          </div>
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
      {/* Conflict or Error Notification */}
      {errorMessage && (
        <div
          role="alert"
          className={`rounded-2xl border p-5 text-sm ${
            isConflict
              ? "border-amber-400 bg-amber-50 text-amber-900"
              : "border-red-300 bg-red-50 text-red-900"
          }`}
        >
          <div className="flex items-start gap-3">
            <InfoIcon
              className={`h-5 w-5 shrink-0 ${
                isConflict ? "text-amber-600" : "text-red-600"
              }`}
            />
            <div>
              <strong className="block font-semibold">
                {isConflict ? "Room Unavailable" : "Booking Error"}
              </strong>
              <p className="mt-1 leading-relaxed">{errorMessage}</p>
              {isConflict && (
                <button
                  type="button"
                  onClick={onBack}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-200/70 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-200"
                >
                  <ArrowLeftIcon className="h-3.5 w-3.5" />
                  Select alternate dates or another room
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Card */}
      <section className="rounded-2xl border border-forest/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between border-b border-forest/10 pb-5">
          <div>
            <span className="text-xs font-medium tracking-wider text-gold uppercase">
              Step 2 of 2
            </span>
            <h3 className="mt-1 font-serif text-2xl font-medium text-forest">
              Review Your Reservation Details
            </h3>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-forest transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-gold"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>

        {/* Room Snapshot */}
        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-36">
            <Image
              src={room.featuredImage.src}
              alt={room.featuredImage.alt}
              fill
              sizes="(min-width: 640px) 144px, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex-1">
            <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wider text-forest uppercase">
              {room.category}
            </span>
            <h4 className="mt-1 font-serif text-xl font-medium text-forest">
              {room.name}
            </h4>
            <p className="mt-1 text-xs text-muted">
              {room.bedConfiguration} &bull; {room.view}
            </p>
          </div>
        </div>

        {/* Stay & Guest Breakdown Grid */}
        <div className="mt-8 grid gap-6 border-t border-forest/10 pt-6 sm:grid-cols-2">
          {/* Stay Schedule */}
          <div className="rounded-xl border border-forest/10 bg-ivory/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-forest uppercase">
              <CalendarIcon className="h-4 w-4 text-gold" />
              Stay Schedule
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted">Check-In:</dt>
                <dd className="font-medium text-forest">
                  {formatDisplayDate(params.checkIn)} (from 2:00 PM)
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Check-Out:</dt>
                <dd className="font-medium text-forest">
                  {formatDisplayDate(params.checkOut)} (until 12:00 PM)
                </dd>
              </div>
              <div className="flex justify-between border-t border-forest/10 pt-2 font-medium">
                <dt className="text-forest">Duration:</dt>
                <dd className="text-forest">
                  {calculation.nights}{" "}
                  {calculation.nights === 1 ? "Night" : "Nights"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Guest Information */}
          <div className="rounded-xl border border-forest/10 bg-ivory/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-forest uppercase">
              <UsersIcon className="h-4 w-4 text-gold" />
              Guest Information
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted">Primary Guest:</dt>
                <dd className="font-medium text-forest">{guest.fullName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Email:</dt>
                <dd className="font-medium text-forest">{guest.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Phone:</dt>
                <dd className="font-medium text-forest">{guest.phone}</dd>
              </div>
              <div className="flex justify-between border-t border-forest/10 pt-2 font-medium">
                <dt className="text-forest">Party Size:</dt>
                <dd className="text-forest">
                  {params.adults} Adults
                  {params.children > 0 && `, ${params.children} Children`}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Special Requests */}
        {guest.specialRequests && (
          <div className="mt-6 rounded-xl border border-forest/10 bg-ivory/30 p-4 text-xs">
            <strong className="block font-medium text-forest">
              Special Requests:
            </strong>
            <p className="mt-1 italic text-muted">{guest.specialRequests}</p>
          </div>
        )}

        {/* Pricing Summary */}
        <div className="mt-8 rounded-xl border border-forest/10 bg-ivory/60 p-5">
          <h4 className="font-serif text-lg font-medium text-forest">
            Estimated Pricing Summary
          </h4>
          <div className="mt-4 space-y-2 text-xs text-muted">
            <div className="flex justify-between">
              <span>
                {formatPhp(calculation.nightlyRatePhp)} &times; {calculation.nights}{" "}
                {calculation.nights === 1 ? "night" : "nights"}
              </span>
              <span>{formatPhp(calculation.subtotalPhp)}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-forest/10 pt-3 text-base font-semibold text-forest">
              <span>Total Estimated</span>
              <span className="text-xl">{formatPhp(calculation.subtotalPhp)}</span>
            </div>
            <p className="text-[0.7rem] text-muted">
              Prices will be confirmed and persisted by the Golden Resort booking API.
            </p>
          </div>
        </div>
      </section>

      {/* Confirmation Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-forest/30 bg-white px-6 py-3.5 text-sm font-medium text-forest transition-colors hover:bg-forest/5 focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Edit Information
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-8 py-4 text-sm font-medium tracking-wide text-forest-dark shadow-md transition-colors hover:bg-gold/90 focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50"
        >
          {isSubmitting ? (
            <span>Securing Reservation...</span>
          ) : (
            <>
              Confirm &amp; Book Reservation
              <CheckIcon className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
