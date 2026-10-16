"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RoomDetail } from "@/types/booking";
import {
  calculateBookingPrice,
  calculateNights,
  formatPhp,
  getDefaultCheckOutDate,
  getTodayLocalDateString,
  validateAvailabilityParams,
} from "@/lib/booking-utils";
import {
  ArrowRightIcon,
  CalendarIcon,
  InfoIcon,
  UsersIcon,
} from "@/components/ui/Icons";

interface RoomDetailBookingBoxProps {
  room: RoomDetail;
}

export default function RoomDetailBookingBox({
  room,
}: RoomDetailBookingBoxProps) {
  const router = useRouter();
  const [todayStr, setTodayStr] = useState<string>("");
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const today = getTodayLocalDateString();
    setTodayStr(today);
    setCheckIn((prev) => prev || today);
    setCheckOut((prev) => prev || getDefaultCheckOutDate(today));
  }, []);

  const nights = calculateNights(checkIn, checkOut);
  const calculation = calculateBookingPrice(room.sampleRatePhp, nights);

  const handleCheckInChange = (newCheckIn: string) => {
    setCheckIn(newCheckIn);
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

  const handleReserve = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateAvailabilityParams(
      { checkIn, checkOut, adults, children },
      room
    );

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    const query = new URLSearchParams({
      room: room.slug,
      checkIn,
      checkOut,
      adults: String(adults),
      children: String(children),
    });
    router.push(`/booking?${query.toString()}`);
  };

  return (
    <div className="rounded-2xl border border-forest/10 bg-white p-6 shadow-xl lg:sticky lg:top-28">
      {/* Rate Header */}
      <div className="border-b border-forest/10 pb-5">
        <span className="text-xs font-medium text-muted">From</span>
        <div className="font-serif text-3xl font-semibold text-forest">
          {formatPhp(room.sampleRatePhp)}
          <span className="text-sm font-sans font-normal text-muted"> / night</span>
        </div>
        <span className="mt-1 block text-[0.7rem] font-medium tracking-wider text-gold uppercase">
          Sample demonstration rate
        </span>
      </div>

      {/* Reservation Form */}
      <form onSubmit={handleReserve} noValidate className="mt-5 space-y-4">
        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="detail-checkIn"
              className="flex items-center gap-1 text-[0.7rem] font-semibold tracking-wider text-forest uppercase"
            >
              <CalendarIcon className="h-3.5 w-3.5 text-gold" />
              Check-In
            </label>
            <input
              id="detail-checkIn"
              type="date"
              min={todayStr}
              value={checkIn}
              onChange={(e) => handleCheckInChange(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-forest/20 bg-ivory/50 px-2.5 py-2 text-xs font-medium text-ink focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold"
            />
            {errors.checkIn && (
              <p className="mt-1 text-[0.7rem] text-red-600">{errors.checkIn}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="detail-checkOut"
              className="flex items-center gap-1 text-[0.7rem] font-semibold tracking-wider text-forest uppercase"
            >
              <CalendarIcon className="h-3.5 w-3.5 text-gold" />
              Check-Out
            </label>
            <input
              id="detail-checkOut"
              type="date"
              min={checkIn ? getDefaultCheckOutDate(checkIn) : todayStr}
              value={checkOut}
              onChange={(e) => {
                setCheckOut(e.target.value);
                if (errors.checkOut) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.checkOut;
                    return next;
                  });
                }
              }}
              className="mt-1.5 w-full rounded-lg border border-forest/20 bg-ivory/50 px-2.5 py-2 text-xs font-medium text-ink focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold"
            />
            {errors.checkOut && (
              <p className="mt-1 text-[0.7rem] text-red-600">{errors.checkOut}</p>
            )}
          </div>
        </div>

        {/* Guests */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="detail-adults"
              className="flex items-center gap-1 text-[0.7rem] font-semibold tracking-wider text-forest uppercase"
            >
              <UsersIcon className="h-3.5 w-3.5 text-gold" />
              Adults
            </label>
            <select
              id="detail-adults"
              value={adults}
              onChange={(e) => {
                setAdults(Number(e.target.value));
                if (errors.guests) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.guests;
                    return next;
                  });
                }
              }}
              className="mt-1.5 w-full rounded-lg border border-forest/20 bg-ivory/50 px-2.5 py-2 text-xs font-medium text-ink focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "Adult" : "Adults"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="detail-children"
              className="block text-[0.7rem] font-semibold tracking-wider text-forest uppercase"
            >
              Children
            </label>
            <select
              id="detail-children"
              value={children}
              onChange={(e) => {
                setChildren(Number(e.target.value));
                if (errors.guests) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.guests;
                    return next;
                  });
                }
              }}
              className="mt-1.5 w-full rounded-lg border border-forest/20 bg-ivory/50 px-2.5 py-2 text-xs font-medium text-ink focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold"
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
          <p className="rounded bg-red-50 p-2 text-xs text-red-700">
            {errors.guests}
          </p>
        )}

        {/* Calculation Preview */}
        {nights > 0 && (
          <div className="space-y-2 border-t border-forest/10 pt-4 text-xs text-ink/80">
            <div className="flex justify-between">
              <span>Stay duration</span>
              <span className="font-medium text-forest">
                {nights} {nights === 1 ? "night" : "nights"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>
                {formatPhp(room.sampleRatePhp)} &times; {nights} {nights === 1 ? "night" : "nights"}
              </span>
              <span>{formatPhp(calculation.subtotalPhp)}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-forest/10 pt-2 text-sm font-semibold text-forest">
              <span>Estimated Subtotal</span>
              <span className="text-base font-bold">
                {formatPhp(calculation.subtotalPhp)}
              </span>
            </div>
          </div>
        )}

        {/* Reserve Action */}
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-sm font-medium tracking-wide text-forest-dark transition-colors hover:bg-gold/90 focus-visible:outline-2 focus-visible:outline-gold shadow-sm"
        >
          Reserve This Room
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </form>

      {/* Notice */}
      <div className="mt-5 flex items-start gap-2 rounded-lg bg-ivory p-3 text-[0.72rem] text-muted">
        <InfoIcon className="h-3.5 w-3.5 shrink-0 text-gold" />
        <p>
          Demonstration availability check. You will be able to review guest
          information on the next step.
        </p>
      </div>
    </div>
  );
}
