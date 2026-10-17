"use client";

import { useState } from "react";
import type {
  AvailabilitySearchParams,
  GuestInfo,
  RoomDetail,
} from "@/types/booking";
import {
  getDefaultCheckOutDate,
  getTodayLocalDateString,
  validateAvailabilityParams,
  validateGuestInfo,
} from "@/lib/booking-utils";
import { ArrowRightIcon } from "@/components/ui/Icons";

interface BookingFormProps {
  rooms: RoomDetail[];
  selectedRoom: RoomDetail;
  onRoomChange: (room: RoomDetail) => void;
  params: AvailabilitySearchParams;
  onParamsChange: (params: AvailabilitySearchParams) => void;
  onContinue: (guest: GuestInfo) => void;
}

export default function BookingForm({
  rooms,
  selectedRoom,
  onRoomChange,
  params,
  onParamsChange,
  onContinue,
}: BookingFormProps) {
  const [todayStr] = useState<string>(() => getTodayLocalDateString());

  const [guest, setGuest] = useState<GuestInfo>({
    fullName: "",
    email: "",
    phone: "",
    specialRequests: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleDateChange = (field: "checkIn" | "checkOut", value: string) => {
    const nextParams = { ...params, [field]: value };
    if (field === "checkIn" && (!params.checkOut || params.checkOut <= value)) {
      nextParams.checkOut = getDefaultCheckOutDate(value);
    }
    onParamsChange(nextParams);
    if (errors[field] || errors.guests) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        delete next.guests;
        return next;
      });
    }
  };

  const handleGuestCountChange = (field: "adults" | "children", val: number) => {
    const nextParams = { ...params, [field]: val };
    onParamsChange(nextParams);
    if (errors[field] || errors.guests) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        delete next.guests;
        return next;
      });
    }
  };

  const handleInputChange = (field: keyof GuestInfo, value: string) => {
    setGuest((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const dateGuestValidation = validateAvailabilityParams(params, selectedRoom);
    const guestValidation = validateGuestInfo(guest);

    const mergedErrors = {
      ...dateGuestValidation.errors,
      ...guestValidation.errors,
    };

    if (Object.keys(mergedErrors).length > 0) {
      setErrors(mergedErrors);
      // Scroll to the first error
      const firstKey = Object.keys(mergedErrors)[0];
      const element = document.getElementById(`booking-${firstKey}`);
      if (element) {
        element.focus();
      }
      return;
    }

    setErrors({});
    onContinue(guest);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {/* 1. Room Selection */}
      <section className="rounded-2xl border border-forest/10 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="font-serif text-2xl font-medium text-forest">
          1. Selected Accommodation
        </h3>
        <p className="mt-1 text-sm text-muted">
          Choose or modify your preferred room or suite.
        </p>

        <div className="mt-5">
          <label htmlFor="booking-room" className="sr-only">
            Select Accommodation
          </label>
          <select
            id="booking-room"
            value={selectedRoom.slug}
            onChange={(e) => {
              const found = rooms.find((r) => r.slug === e.target.value);
              if (found) onRoomChange(found);
            }}
            className="w-full rounded-lg border border-forest/20 bg-ivory/50 px-4 py-3 text-sm font-medium text-ink transition-colors focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold"
          >
            {rooms.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name} — Up to {r.maxGuests} guests
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* 2. Dates & Guests */}
      <section className="rounded-2xl border border-forest/10 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="font-serif text-2xl font-medium text-forest">
          2. Dates & Guests
        </h3>
        <p className="mt-1 text-sm text-muted">
          Specify your arrival and departure schedule.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {/* Check-in */}
          <div>
            <label
              htmlFor="booking-checkIn"
              className="block text-xs font-semibold tracking-wider text-forest uppercase"
            >
              Check-In Date *
            </label>
            <input
              id="booking-checkIn"
              type="date"
              min={todayStr}
              value={params.checkIn}
              onChange={(e) => handleDateChange("checkIn", e.target.value)}
              aria-invalid={!!errors.checkIn}
              aria-describedby={errors.checkIn ? "booking-checkIn-error" : undefined}
              className="mt-2 w-full rounded-lg border border-forest/20 bg-ivory/50 px-3.5 py-2.5 text-sm font-medium text-ink focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold"
            />
            {errors.checkIn && (
              <p id="booking-checkIn-error" className="mt-1 text-xs text-red-600">
                {errors.checkIn}
              </p>
            )}
          </div>

          {/* Check-out */}
          <div>
            <label
              htmlFor="booking-checkOut"
              className="block text-xs font-semibold tracking-wider text-forest uppercase"
            >
              Check-Out Date *
            </label>
            <input
              id="booking-checkOut"
              type="date"
              min={params.checkIn ? getDefaultCheckOutDate(params.checkIn) : todayStr}
              value={params.checkOut}
              onChange={(e) => handleDateChange("checkOut", e.target.value)}
              aria-invalid={!!errors.checkOut}
              aria-describedby={errors.checkOut ? "booking-checkOut-error" : undefined}
              className="mt-2 w-full rounded-lg border border-forest/20 bg-ivory/50 px-3.5 py-2.5 text-sm font-medium text-ink focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold"
            />
            {errors.checkOut && (
              <p id="booking-checkOut-error" className="mt-1 text-xs text-red-600">
                {errors.checkOut}
              </p>
            )}
          </div>

          {/* Adults */}
          <div>
            <label
              htmlFor="booking-adults"
              className="block text-xs font-semibold tracking-wider text-forest uppercase"
            >
              Adults *
            </label>
            <select
              id="booking-adults"
              value={params.adults}
              onChange={(e) => handleGuestCountChange("adults", Number(e.target.value))}
              className="mt-2 w-full rounded-lg border border-forest/20 bg-ivory/50 px-3.5 py-2.5 text-sm font-medium text-ink focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "Adult" : "Adults"}
                </option>
              ))}
            </select>
          </div>

          {/* Children */}
          <div>
            <label
              htmlFor="booking-children"
              className="block text-xs font-semibold tracking-wider text-forest uppercase"
            >
              Children
            </label>
            <select
              id="booking-children"
              value={params.children}
              onChange={(e) => handleGuestCountChange("children", Number(e.target.value))}
              className="mt-2 w-full rounded-lg border border-forest/20 bg-ivory/50 px-3.5 py-2.5 text-sm font-medium text-ink focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold"
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "Child" : "Children"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {errors.guests && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {errors.guests}
          </p>
        )}
      </section>

      {/* 3. Primary Guest Information */}
      <section className="rounded-2xl border border-forest/10 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="font-serif text-2xl font-medium text-forest">
          3. Guest Details
        </h3>
        <p className="mt-1 text-sm text-muted">
          Please provide your contact details for the reservation preview.
        </p>

        <div className="mt-6 space-y-5">
          {/* Full Name */}
          <div>
            <label
              htmlFor="booking-fullName"
              className="block text-xs font-semibold tracking-wider text-forest uppercase"
            >
              Full Name *
            </label>
            <input
              id="booking-fullName"
              type="text"
              autoComplete="name"
              placeholder="e.g. Maria Santos"
              value={guest.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? "booking-fullName-error" : undefined}
              className="mt-2 w-full rounded-lg border border-forest/20 bg-ivory/50 px-3.5 py-2.5 text-sm font-medium text-ink focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold"
            />
            {errors.fullName && (
              <p id="booking-fullName-error" className="mt-1 text-xs text-red-600">
                {errors.fullName}
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Email */}
            <div>
              <label
                htmlFor="booking-email"
                className="block text-xs font-semibold tracking-wider text-forest uppercase"
              >
                Email Address *
              </label>
              <input
                id="booking-email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={guest.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "booking-email-error" : undefined}
                className="mt-2 w-full rounded-lg border border-forest/20 bg-ivory/50 px-3.5 py-2.5 text-sm font-medium text-ink focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold"
              />
              {errors.email && (
                <p id="booking-email-error" className="mt-1 text-xs text-red-600">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="booking-phone"
                className="block text-xs font-semibold tracking-wider text-forest uppercase"
              >
                Phone Number *
              </label>
              <input
                id="booking-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+63 912 345 6789"
                value={guest.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "booking-phone-error" : undefined}
                className="mt-2 w-full rounded-lg border border-forest/20 bg-ivory/50 px-3.5 py-2.5 text-sm font-medium text-ink focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold"
              />
              {errors.phone && (
                <p id="booking-phone-error" className="mt-1 text-xs text-red-600">
                  {errors.phone}
                </p>
              )}
            </div>
          </div>

          {/* Special Requests */}
          <div>
            <label
              htmlFor="booking-specialRequests"
              className="block text-xs font-semibold tracking-wider text-forest uppercase"
            >
              Special Requests (Optional)
            </label>
            <textarea
              id="booking-specialRequests"
              rows={3}
              placeholder="Early check-in request, dietary preferences, celebratory arrangements..."
              value={guest.specialRequests}
              onChange={(e) => handleInputChange("specialRequests", e.target.value)}
              className="mt-2 w-full rounded-lg border border-forest/20 bg-ivory/50 px-3.5 py-2.5 text-sm font-medium text-ink focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
        </div>
      </section>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest px-8 py-4 text-base font-medium tracking-wide text-white transition-colors hover:bg-forest-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:w-auto"
        >
          Review Booking
          <ArrowRightIcon className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}
