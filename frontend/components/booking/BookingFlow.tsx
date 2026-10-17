"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sampleRooms } from "@/data/rooms";
import type {
  AvailabilitySearchParams,
  BookingSubmissionState,
  GuestInfo,
  RoomDetail,
} from "@/types/booking";
import {
  calculateBookingPrice,
  calculateNights,
  getDefaultCheckOutDate,
  getTodayLocalDateString,
} from "@/lib/booking-utils";
import BookingForm from "@/components/booking/BookingForm";
import BookingSummaryCard from "@/components/booking/BookingSummaryCard";
import BookingReview from "@/components/booking/BookingReview";

import { getRooms } from "@/lib/api";

export default function BookingFlow() {
  const searchParams = useSearchParams();

  // Read URL query params with today's local defaults
  const today = getTodayLocalDateString();
  const initialRoomSlug = searchParams.get("room") || sampleRooms[0].slug;
  const initialCheckIn = searchParams.get("checkIn") || today;
  const initialCheckOut =
    searchParams.get("checkOut") || getDefaultCheckOutDate(initialCheckIn);
  const initialAdults = Number(searchParams.get("adults") || 2);
  const initialChildren = Number(searchParams.get("children") || 0);

  const [rooms, setRooms] = useState<RoomDetail[]>(sampleRooms);
  const [selectedRoom, setSelectedRoom] = useState<RoomDetail>(
    () => sampleRooms.find((r) => r.slug === initialRoomSlug) || sampleRooms[0]
  );
  const [params, setParams] = useState<AvailabilitySearchParams>({
    checkIn: initialCheckIn,
    checkOut: initialCheckOut,
    adults: initialAdults,
    children: initialChildren,
    roomSlug: initialRoomSlug,
  });

  useEffect(() => {
    let mounted = true;
    getRooms()
      .then((data) => {
        if (mounted && data.length > 0) {
          setRooms(data);
          const found = data.find((r) => r.slug === initialRoomSlug) || data[0];
          setSelectedRoom(found);
          if (found && found.slug !== initialRoomSlug) {
            setParams((prev) => ({ ...prev, roomSlug: found.slug }));
          }
        }
      })
      .catch((err) => {
        console.warn("Could not fetch rooms from API:", err);
      });
    return () => {
      mounted = false;
    };
  }, [initialRoomSlug]);

  const [step, setStep] = useState<"form" | "review">("form");
  const [submissionState, setSubmissionState] =
    useState<BookingSubmissionState | null>(null);

  const handleRoomChange = (room: RoomDetail) => {
    setSelectedRoom(room);
    setParams((prev) => ({ ...prev, roomSlug: room.slug }));
  };

  const handleContinueToReview = (guest: GuestInfo) => {
    const nights = calculateNights(params.checkIn, params.checkOut);
    const calculation = calculateBookingPrice(selectedRoom.sampleRatePhp, nights);

    setSubmissionState({
      room: selectedRoom,
      params,
      calculation,
      guest,
    });
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToForm = () => {
    setStep("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      {/* Progress Indicator */}
      <div className="mb-10 flex items-center justify-center gap-3 text-xs tracking-wider uppercase sm:text-sm">
        <span
          className={`flex items-center gap-2 font-medium ${
            step === "form" ? "text-forest" : "text-muted"
          }`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
              step === "form"
                ? "bg-forest text-white"
                : "bg-forest/10 text-forest"
            }`}
          >
            1
          </span>
          Guest &amp; Stay Details
        </span>

        <span className="h-px w-8 bg-forest/20" aria-hidden="true" />

        <span
          className={`flex items-center gap-2 font-medium ${
            step === "review" ? "text-forest" : "text-muted"
          }`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
              step === "review"
                ? "bg-forest text-white"
                : "border border-forest/20 text-muted"
            }`}
          >
            2
          </span>
          Review &amp; Confirmation Preview
        </span>
      </div>

      {step === "form" ? (
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
          <BookingForm
            rooms={rooms}
            selectedRoom={selectedRoom}
            onRoomChange={handleRoomChange}
            params={params}
            onParamsChange={setParams}
            onContinue={handleContinueToReview}
          />

          <div>
            <BookingSummaryCard room={selectedRoom} params={params} />
          </div>
        </div>
      ) : (
        submissionState && (
          <div className="mx-auto max-w-3xl">
            <BookingReview
              bookingData={submissionState}
              onBack={handleBackToForm}
            />
          </div>
        )
      )}
    </div>
  );
}
