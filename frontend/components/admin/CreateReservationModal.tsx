"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  checkAdminRoomAvailability,
  createAdminReservation,
  type QuickCheckRoomResult,
  type CreateAdminReservationPayload,
} from "@/lib/admin-api";
import { formatPhp } from "@/lib/booking-utils";
import {
  CloseIcon,
  CalendarIcon,
  UsersIcon,
  DoorIcon,
  CreditCardIcon,
  CheckIcon,
  InfoIcon,
  RefreshIcon,
  ClipboardListIcon,
} from "@/components/ui/Icons";

interface CreateReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (reservation: any) => void;
}

export default function CreateReservationModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateReservationModalProps) {
  const pathname = usePathname();
  const portalBase = pathname.startsWith("/staff") ? "/staff" : "/admin";

  // Form State
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState<string>(todayStr);
  const [checkOut, setCheckOut] = useState<string>(tomorrowStr);
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  // Guest Details
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [specialRequests, setSpecialRequests] = useState<string>("");

  // Booking Source & Initial Status
  const [bookingSource, setBookingSource] = useState<
    "walk_in" | "phone" | "front_desk" | "corporate" | "ota"
  >("walk_in");
  const [status, setStatus] = useState<"confirmed" | "pending">("confirmed");

  // Initial Payment Option
  const [recordPayment, setRecordPayment] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "bank_transfer" | "credit_card" | "credit_card_terminal" | "e_wallet" | "other"
  >("cash");
  const [paymentNotes, setPaymentNotes] = useState<string>("");

  // Room Availability States
  const [availableRooms, setAvailableRooms] = useState<QuickCheckRoomResult[]>([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState<boolean>(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdReservation, setCreatedReservation] = useState<any | null>(null);

  // Calculate Nights
  const calculateNights = (inDate: string, outDate: string): number => {
    try {
      const d1 = new Date(inDate);
      const d2 = new Date(outDate);
      const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    } catch {
      return 0;
    }
  };

  const nights = calculateNights(checkIn, checkOut);

  // Find currently selected room details
  const selectedRoom = availableRooms.find((r) => r.room_id === selectedRoomId);
  const calculatedTotalPrice = selectedRoom ? selectedRoom.nightly_rate_php * nights : 0;

  // Auto-fetch availability when dates change
  const fetchAvailability = async () => {
    if (!checkIn || !checkOut || nights <= 0) return;
    setIsCheckingAvailability(true);
    setAvailabilityError(null);
    try {
      const res = await checkAdminRoomAvailability({
        check_in: checkIn,
        check_out: checkOut,
      });
      setAvailableRooms(res.rooms || []);
      // If currently selected room is not available, reset it
      if (selectedRoomId) {
        const found = res.rooms?.find((r) => r.room_id === selectedRoomId && r.is_available);
        if (!found) {
          const firstAvail = res.rooms?.find((r) => r.is_available);
          setSelectedRoomId(firstAvail ? firstAvail.room_id : null);
        }
      } else {
        const firstAvail = res.rooms?.find((r) => r.is_available);
        if (firstAvail) setSelectedRoomId(firstAvail.room_id);
      }
    } catch (err: any) {
      setAvailabilityError(err?.message || "Failed to check room availability.");
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAvailability();
    }
  }, [isOpen, checkIn, checkOut]);

  // Sync default payment amount when room or nights change
  useEffect(() => {
    if (recordPayment && calculatedTotalPrice > 0 && !paymentAmount) {
      setPaymentAmount(String(calculatedTotalPrice));
    }
  }, [calculatedTotalPrice, recordPayment]);

  const resetForm = () => {
    setCheckIn(todayStr);
    setCheckOut(tomorrowStr);
    setAdults(2);
    setChildren(0);
    setSelectedRoomId(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setSpecialRequests("");
    setBookingSource("walk_in");
    setStatus("confirmed");
    setRecordPayment(false);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentNotes("");
    setSubmitError(null);
    setCreatedReservation(null);
  };

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedRoomId) {
      setSubmitError("Please select an available accommodation.");
      return;
    }
    if (nights <= 0) {
      setSubmitError("Check-out date must be at least one day after check-in date.");
      return;
    }
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setSubmitError("Primary guest full name, email, and phone number are required.");
      return;
    }

    const payload: CreateAdminReservationPayload = {
      room_id: selectedRoomId,
      check_in: checkIn,
      check_out: checkOut,
      adults: Number(adults),
      children: Number(children),
      guest_full_name: fullName.trim(),
      guest_email: email.trim(),
      guest_phone: phone.trim(),
      booking_source: bookingSource,
      status: status,
      special_requests: specialRequests.trim() || undefined,
    };

    if (recordPayment && paymentAmount && Number(paymentAmount) > 0) {
      payload.initial_payment = {
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        notes: paymentNotes.trim() || undefined,
      };
    }

    setIsSubmitting(true);
    try {
      const res = await createAdminReservation(payload);
      setCreatedReservation(res.data);
      if (onSuccess) {
        onSuccess(res.data);
      }
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to create reservation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl max-h-[90vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest/10 text-forest">
              <ClipboardListIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-serif text-xl font-bold text-forest">
                {createdReservation ? "Reservation Confirmed" : "New Walk-In & Phone Reservation"}
              </h3>
              <p className="text-xs text-muted">
                {createdReservation
                  ? "Booking created successfully in system ledger"
                  : "Direct booking creation for front desk & resort administrators"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink transition cursor-pointer"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* =========================================================================
            SUCCESS SCREEN
           ========================================================================= */}
        {createdReservation ? (
          <div className="py-6 space-y-6 overflow-y-auto">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center space-y-3">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckIcon className="h-6 w-6" />
              </span>
              <h4 className="font-serif text-2xl font-bold text-forest">
                Booking Reference: {createdReservation.booking_reference}
              </h4>
              <p className="text-xs text-emerald-800">
                Reservation recorded for{" "}
                <span className="font-bold">{createdReservation.guest_name_snapshot}</span> in{" "}
                <span className="font-bold">{createdReservation.room?.name}</span>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <p className="text-muted font-semibold uppercase tracking-wider text-[11px]">
                  Stay Summary
                </p>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-muted">Dates:</span>
                  <span className="font-medium text-ink">
                    {createdReservation.check_in} &ndash; {createdReservation.check_out}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-muted">Length of Stay:</span>
                  <span className="font-medium text-ink">
                    {createdReservation.nights} Night{createdReservation.nights > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-muted">Guests:</span>
                  <span className="font-medium text-ink">
                    {createdReservation.adults} Adults
                    {createdReservation.children ? `, ${createdReservation.children} Children` : ""}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted">Booking Source:</span>
                  <span className="font-bold uppercase tracking-wider text-forest">
                    {createdReservation.booking_source?.replace("_", " ") || "Walk-In"}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <p className="text-muted font-semibold uppercase tracking-wider text-[11px]">
                  Financial Ledger
                </p>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-muted">Total Charges:</span>
                  <span className="font-semibold text-forest">
                    {formatPhp(createdReservation.total_price_php || 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-muted">Paid Amount:</span>
                  <span className="font-semibold text-emerald-700">
                    {formatPhp(createdReservation.total_paid_php || 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-muted">Outstanding Balance:</span>
                  <span className="font-bold text-rose-700">
                    {formatPhp(createdReservation.remaining_balance_php || 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted">Payment Status:</span>
                  <span className="font-bold uppercase tracking-wider text-ink">
                    {createdReservation.payment_status || "unpaid"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleModalClose}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Close Dialog
              </button>
              <Link
                href={`${portalBase}/reservations/${createdReservation.id || createdReservation.booking_reference}`}
                className="rounded-xl bg-forest px-5 py-2.5 text-xs font-semibold text-white hover:bg-forest-dark transition shadow-sm"
              >
                View Reservation Details &rarr;
              </Link>
            </div>
          </div>
        ) : (
          /* =========================================================================
              CREATION FORM
             ========================================================================= */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 py-4 pr-1">
            {submitError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-900 flex items-start gap-3">
                <InfoIcon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Section 1: Dates & Guests */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4 text-forest" />
                1. Stay Schedule &amp; Headcount
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Check-in Date *</label>
                  <input
                    type="date"
                    min={todayStr}
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-ink focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Check-out Date *</label>
                  <input
                    type="date"
                    min={checkIn || todayStr}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-ink focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Adults (Age 13+) *</label>
                  <select
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-ink focus:border-gold focus:outline-none bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} Adult{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Children (0-12)</label>
                  <select
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-ink focus:border-gold focus:outline-none bg-white"
                  >
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} Child{n !== 1 ? "ren" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted px-1">
                <span>
                  Length of stay:{" "}
                  <strong className="text-forest">
                    {nights} Night{nights > 1 ? "s" : ""}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={fetchAvailability}
                  disabled={isCheckingAvailability}
                  className="inline-flex items-center gap-1 font-semibold text-forest hover:text-gold transition cursor-pointer"
                >
                  <RefreshIcon
                    className={`h-3 w-3 ${isCheckingAvailability ? "animate-spin" : ""}`}
                  />
                  Refresh Availability
                </button>
              </div>
            </div>

            {/* Section 2: Room Selection */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                <DoorIcon className="h-4 w-4 text-forest" />
                2. Select Accommodation
              </h4>

              {availabilityError && (
                <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  {availabilityError}
                </p>
              )}

              {isCheckingAvailability ? (
                <div className="rounded-2xl border border-slate-200 p-6 text-center text-xs text-muted">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-forest border-t-gold mb-2" />
                  <p>Checking live inventory and maintenance restrictions...</p>
                </div>
              ) : availableRooms.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-muted">
                  No accommodations found for the requested dates. Please adjust your stay schedule.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                  {availableRooms.map((room) => {
                    const isSelected = selectedRoomId === room.room_id;
                    const isAvailable = room.is_available && (room.available_units ?? 0) > 0;
                    const subtotal = room.nightly_rate_php * nights;

                    return (
                      <button
                        type="button"
                        key={room.room_id}
                        disabled={!isAvailable}
                        onClick={() => setSelectedRoomId(room.room_id)}
                        className={`rounded-2xl border p-3.5 text-left transition flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? "border-forest bg-forest/5 ring-2 ring-forest"
                            : isAvailable
                            ? "border-slate-200 bg-white hover:border-gold hover:bg-slate-50/50"
                            : "border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-serif text-sm font-bold text-forest">{room.name}</p>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                              {room.category}
                            </span>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isAvailable
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {isAvailable ? `${room.available_units} Available` : "Fully Booked"}
                          </span>
                        </div>

                        <div className="mt-2.5 flex items-baseline justify-between border-t border-slate-100 pt-2 text-xs">
                          <span className="text-muted text-[11px]">
                            {formatPhp(room.nightly_rate_php)} / night
                          </span>
                          <span className="font-bold text-forest">
                            {formatPhp(subtotal)} ({nights}n)
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 3: Guest Information */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                <UsersIcon className="h-4 w-4 text-forest" />
                3. Primary Guest Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Juan Dela Cruz"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-ink focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    placeholder="guest@example.ph"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-ink focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="+63 9XX XXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-ink focus:border-gold focus:outline-none"
                  />
                </div>
              </div>
              <div className="text-xs">
                <label className="block font-medium text-slate-700 mb-1">
                  Special Requests / Front Desk Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Ground floor request, late arrival, vegetarian meal preferences..."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-ink focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            {/* Section 4: Booking Source & Status */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                <DoorIcon className="h-4 w-4 text-forest" />
                4. Channel &amp; Initial Status
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Booking Source *</label>
                  <select
                    value={bookingSource}
                    onChange={(e) => setBookingSource(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-ink focus:border-gold focus:outline-none bg-white"
                  >
                    <option value="walk_in">Walk-In (In-person front desk guest)</option>
                    <option value="phone">Phone Reservation (Direct telephone caller)</option>
                    <option value="front_desk">Front Desk / Internal Concierge</option>
                    <option value="corporate">Corporate / Partner Booking</option>
                    <option value="ota">OTA / Third-Party Manual Import</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-ink focus:border-gold focus:outline-none bg-white"
                  >
                    <option value="confirmed">Confirmed (Guaranteed booking)</option>
                    <option value="pending">Pending (Tentative / Awaiting verification)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 5: Initial Payment Collection (Optional) */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recordPayment}
                    onChange={(e) => {
                      setRecordPayment(e.target.checked);
                      if (e.target.checked && calculatedTotalPrice > 0 && !paymentAmount) {
                        setPaymentAmount(String(calculatedTotalPrice));
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-forest focus:ring-gold"
                  />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CreditCardIcon className="h-4 w-4 text-forest" />
                    Record Initial Payment / Deposit Now
                  </span>
                </label>
                {selectedRoom && (
                  <span className="text-xs font-semibold text-forest">
                    Stay Total: {formatPhp(calculatedTotalPrice)}
                  </span>
                )}
              </div>

              {recordPayment && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-slate-200/70">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Payment Amount (₱) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={calculatedTotalPrice || 999999}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="e.g. 5000.00"
                      required={recordPayment}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-ink focus:border-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-ink focus:border-gold focus:outline-none"
                    >
                      <option value="cash">Cash (On-Site Handover)</option>
                      <option value="credit_card_terminal">POS Card Terminal</option>
                      <option value="credit_card">Credit / Debit Card</option>
                      <option value="e_wallet">E-Wallet (GCash / Maya)</option>
                      <option value="bank_transfer">Bank Deposit / Transfer</option>
                      <option value="other">Other Manual Settlement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Payment Reference / Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Cash received at desk"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-ink focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="text-xs text-muted">
                {selectedRoom ? (
                  <span>
                    Selected: <strong>{selectedRoom.name}</strong> &bull; Total:{" "}
                    <strong className="text-forest">{formatPhp(calculatedTotalPrice)}</strong>
                  </span>
                ) : (
                  <span>No accommodation selected</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleModalClose}
                  disabled={isSubmitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedRoomId || nights <= 0}
                  className="rounded-xl bg-forest px-5 py-2.5 text-xs font-bold text-white hover:bg-forest-dark transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshIcon className="h-4 w-4 animate-spin" />
                      Creating Reservation...
                    </>
                  ) : (
                    "Create Reservation"
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
