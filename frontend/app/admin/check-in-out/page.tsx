"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  getAdminCheckInOutOverview,
  processAdminCheckIn,
  processAdminCheckOut,
  type CheckInOutOverviewResponse,
  type CheckInOutReservationItem,
  type CheckInOutMetrics,
} from "@/lib/admin-api";
import { formatPhp, formatDisplayDate } from "@/lib/booking-utils";
import {
  KeyIcon,
  ClockIcon,
  SparklesIcon,
  WrenchIcon,
  CheckIcon,
  CloseIcon,
  FilterIcon,
  DoorIcon,
  UsersIcon,
  CalendarIcon,
  InfoIcon,
} from "@/components/ui/Icons";

export default function AdminCheckInOutPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const [activeTab, setActiveTab] = useState<"arrivals" | "departures" | "in_house">("arrivals");

  // Overview Data
  const [overviewData, setOverviewData] = useState<CheckInOutOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success Feedback Banner
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Check-In Modal State
  const [checkInModalOpen, setCheckInModalOpen] = useState<boolean>(false);
  const [selectedCheckInRes, setSelectedCheckInRes] = useState<CheckInOutReservationItem | null>(null);
  const [checkInNotes, setCheckInNotes] = useState<string>("");
  const [acknowledgeBalanceIn, setAcknowledgeBalanceIn] = useState<boolean>(false);
  const [checkInSubmitting, setCheckInSubmitting] = useState<boolean>(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // Check-Out Modal State
  const [checkOutModalOpen, setCheckOutModalOpen] = useState<boolean>(false);
  const [selectedCheckOutRes, setSelectedCheckOutRes] = useState<CheckInOutReservationItem | null>(null);
  const [checkOutNotes, setCheckOutNotes] = useState<string>("");
  const [acknowledgeBalanceOut, setAcknowledgeBalanceOut] = useState<boolean>(false);
  const [checkOutSubmitting, setCheckOutSubmitting] = useState<boolean>(false);
  const [checkOutError, setCheckOutError] = useState<string | null>(null);

  // Fetch Overview Data
  const fetchOverview = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getAdminCheckInOutOverview({ date: selectedDate });
      setOverviewData(res);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to load front desk overview.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [selectedDate]);

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today.toISOString().split("T")[0]);
  };

  const formattedDateTitle = useMemo(() => {
    const parts = selectedDate.split("-").map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(d);
    }
    return selectedDate;
  }, [selectedDate]);

  // Execute Check-In
  const handleConfirmCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheckInRes) return;

    setCheckInSubmitting(true);
    setCheckInError(null);
    try {
      const res = await processAdminCheckIn(selectedCheckInRes.id, {
        notes: checkInNotes,
        acknowledge_balance: acknowledgeBalanceIn,
      });

      setSuccessBanner(res.message);
      setCheckInModalOpen(false);
      setSelectedCheckInRes(null);
      setCheckInNotes("");
      setAcknowledgeBalanceIn(false);
      fetchOverview();
    } catch (err: any) {
      setCheckInError(err.message || "Failed to complete check-in.");
    } finally {
      setCheckInSubmitting(false);
    }
  };

  // Execute Check-Out
  const handleConfirmCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheckOutRes) return;

    setCheckOutSubmitting(true);
    setCheckOutError(null);
    try {
      const res = await processAdminCheckOut(selectedCheckOutRes.id, {
        notes: checkOutNotes,
        acknowledge_balance: acknowledgeBalanceOut,
      });

      setSuccessBanner(res.message);
      setCheckOutModalOpen(false);
      setSelectedCheckOutRes(null);
      setCheckOutNotes("");
      setAcknowledgeBalanceOut(false);
      fetchOverview();
    } catch (err: any) {
      setCheckOutError(err.message || "Failed to complete check-out.");
    } finally {
      setCheckOutSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-forest/10 text-forest">
              <KeyIcon className="h-5 w-5 text-forest" />
            </span>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-forest sm:text-3xl">
              Front Desk & Check-In Operations
            </h1>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            Arriving guest registration, departure processing, payment verification, and room turnover management.
          </p>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={handlePrevDay}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
            title="Previous Day"
          >
            &larr;
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-forest focus:outline-none focus:border-forest"
          />

          <button
            type="button"
            onClick={handleNextDay}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
            title="Next Day"
          >
            &rarr;
          </button>

          <button
            type="button"
            onClick={handleToday}
            className="rounded-lg border border-forest/20 px-3 py-1 text-xs font-semibold text-forest hover:bg-forest/5 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Date Title Banner */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h2 className="font-serif text-lg font-bold text-forest">{formattedDateTitle}</h2>
        <span className="text-xs text-stone-600">Standard Check-In: 2:00 PM &bull; Check-Out: 12:00 PM</span>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 shadow-sm">
          <span>{successBanner}</span>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          {errorMessage}
        </div>
      )}

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {/* Expected Arrivals */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-emerald-700">
            Expected Arrivals
          </span>
          <p className="mt-1 font-serif text-2xl font-bold text-emerald-700">
            {overviewData?.metrics?.total_arrivals ?? "..."}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[0.65rem] text-stone-600">
            <span>{overviewData?.metrics?.arrived_count ?? 0} Arrived</span>
            <span>&bull;</span>
            <span className="font-semibold text-emerald-800">
              {overviewData?.metrics?.pending_arrivals ?? 0} Pending
            </span>
          </div>
        </div>

        {/* Expected Departures */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-sky-700">
            Expected Departures
          </span>
          <p className="mt-1 font-serif text-2xl font-bold text-sky-700">
            {overviewData?.metrics?.total_departures ?? "..."}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[0.65rem] text-stone-600">
            <span>{overviewData?.metrics?.departed_count ?? 0} Departed</span>
            <span>&bull;</span>
            <span className="font-semibold text-sky-800">
              {overviewData?.metrics?.pending_departures ?? 0} In-House
            </span>
          </div>
        </div>

        {/* In-House Guests */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-forest">
            Total In-House
          </span>
          <p className="mt-1 font-serif text-2xl font-bold text-forest">
            {overviewData?.metrics?.in_house_count ?? "..."}
          </p>
          <span className="text-[0.7rem] text-stone-600">Currently staying</span>
        </div>

        {/* Overdue / Late Departures */}
        <div className={`rounded-xl border p-4 shadow-sm ${
          (overviewData?.metrics?.overdue_departures ?? 0) > 0
            ? "border-rose-300 bg-rose-50/70"
            : "border-slate-200 bg-white"
        }`}>
          <span className={`text-[0.7rem] font-semibold uppercase tracking-wider ${
            (overviewData?.metrics?.overdue_departures ?? 0) > 0 ? "text-rose-700" : "text-stone-600"
          }`}>
            Overdue Departures
          </span>
          <p className={`mt-1 font-serif text-2xl font-bold ${
            (overviewData?.metrics?.overdue_departures ?? 0) > 0 ? "text-rose-700" : "text-slate-800"
          }`}>
            {overviewData?.metrics?.overdue_departures ?? "..."}
          </p>
          <span className="text-[0.7rem] text-stone-600">Past 12:00 PM cutoff</span>
        </div>

        {/* Arrivals with Unsettled Balance */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-amber-700">
            Unpaid Arrivals
          </span>
          <p className="mt-1 font-serif text-2xl font-bold text-amber-700">
            {overviewData?.metrics?.unpaid_arrivals ?? "..."}
          </p>
          <span className="text-[0.7rem] text-stone-600">Payment required</span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("arrivals")}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === "arrivals"
                ? "border-forest text-forest"
                : "border-transparent text-stone-600 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            <KeyIcon className="h-4 w-4" />
            Arrivals ({overviewData?.arrivals?.length ?? 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("departures")}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === "departures"
                ? "border-forest text-forest"
                : "border-transparent text-stone-600 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            <ClockIcon className="h-4 w-4" />
            Departures ({overviewData?.departures?.length ?? 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("in_house")}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === "in_house"
                ? "border-forest text-forest"
                : "border-transparent text-stone-600 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            <DoorIcon className="h-4 w-4" />
            Currently In-House ({overviewData?.in_house?.length ?? 0})
          </button>
        </nav>
      </div>

      {/* Main Workspace */}
      {isLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-forest border-t-gold" />
          <p className="mt-3 text-xs font-medium text-stone-600">Loading front desk records...</p>
        </div>
      ) : activeTab === "arrivals" ? (
        /* ==================== TAB 1: ARRIVALS ==================== */
        <div className="space-y-4">
          {(!overviewData?.arrivals || overviewData.arrivals.length === 0) ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <KeyIcon className="h-10 w-10 text-stone-600" />
              <h3 className="mt-2 font-serif text-lg font-bold text-forest">No Arrivals Scheduled</h3>
              <p className="text-xs text-stone-600">No guests are scheduled to arrive on {formattedDateTitle}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {overviewData.arrivals.map((res) => {
                const isCheckedIn = res.status === "checked_in" || res.status === "completed";

                return (
                  <div
                    key={res.id}
                    className={`rounded-2xl border p-5 shadow-sm transition-all bg-white flex flex-col justify-between ${
                      isCheckedIn
                        ? "border-emerald-200 bg-emerald-50/20"
                        : res.has_outstanding_balance
                        ? "border-amber-300"
                        : "border-slate-200"
                    }`}
                  >
                    <div>
                      {/* Top Bar: Booking Ref & Status */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-forest">
                          {res.booking_reference}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${
                            isCheckedIn
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {res.status === "checked_in" ? "Checked In" : res.status}
                        </span>
                      </div>

                      {/* Guest Info */}
                      <div className="mt-3">
                        <h3 className="font-serif text-base font-bold text-forest">{res.guest_name}</h3>
                        <p className="text-[0.7rem] text-stone-600">
                          {res.guest_email || "No email"} &bull; {res.guest_phone || "No phone"}
                        </p>
                        <p className="mt-0.5 text-[0.7rem] text-stone-600">
                          Party: {res.adults} Adults{res.children > 0 && `, ${res.children} Children`} ({res.total_guests} total)
                        </p>
                      </div>

                      {/* Accommodation & Readiness */}
                      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-forest">{res.room_name}</span>
                          <span className="capitalize text-[0.65rem] text-stone-600 font-medium">
                            {res.room_category}
                          </span>
                        </div>

                        {/* Room Condition Badge */}
                        <div className="pt-1">
                          {res.is_room_ready ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-800">
                              <SparklesIcon className="h-3 w-3 text-emerald-600" />
                              Room Inspected & Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-800">
                              <InfoIcon className="h-3 w-3 text-amber-600" />
                              Room: {res.room_housekeeping_status} (Verification Needed)
                            </span>
                          )}
                        </div>

                        <div className="border-t border-slate-200 pt-1.5 flex justify-between text-[0.7rem]">
                          <span className="text-stone-600">Stay Duration:</span>
                          <span className="font-medium text-slate-800">
                            {formatDisplayDate(res.check_in)} &rarr; {formatDisplayDate(res.check_out)} ({res.nights} {res.nights === 1 ? "night" : "nights"})
                          </span>
                        </div>
                      </div>

                      {/* Payment Clearance Badge */}
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-[0.7rem] text-stone-600 font-semibold uppercase">Financial Clearance:</span>
                        {res.has_outstanding_balance ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[0.7rem] font-bold text-amber-800 border border-amber-300">
                            Balance Due: {formatPhp(res.remaining_balance_php)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[0.7rem] font-semibold text-emerald-800 border border-emerald-300">
                            Paid in Full ({formatPhp(res.total_price_php)})
                          </span>
                        )}
                      </div>

                      {/* Check-in Timestamp (if arrived) */}
                      {res.checked_in_at && (
                        <div className="mt-2 text-[0.65rem] text-emerald-800 bg-emerald-50 rounded-lg p-2">
                          Checked in: {new Date(res.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {res.checked_in_by && ` by ${res.checked_in_by.name}`}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action */}
                    <div className="mt-5 border-t border-slate-100 pt-3">
                      {!isCheckedIn ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCheckInRes(res);
                            setCheckInNotes(res.check_in_notes || "");
                            setAcknowledgeBalanceIn(false);
                            setCheckInModalOpen(true);
                            setCheckInError(null);
                          }}
                          className="w-full rounded-xl bg-forest py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gold hover:bg-forest-dark transition-colors shadow-sm"
                        >
                          Process Check-In
                        </button>
                      ) : (
                        <Link
                          href={`/admin/reservations`}
                          className="block w-full rounded-xl border border-slate-200 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          View Reservation Details
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === "departures" ? (
        /* ==================== TAB 2: DEPARTURES ==================== */
        <div className="space-y-4">
          {(!overviewData?.departures || overviewData.departures.length === 0) ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <ClockIcon className="h-10 w-10 text-stone-600" />
              <h3 className="mt-2 font-serif text-lg font-bold text-forest">No Departures Scheduled</h3>
              <p className="text-xs text-stone-600">No guests are scheduled to depart on {formattedDateTitle}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {overviewData.departures.map((res) => {
                const isDeparted = res.status === "completed";

                return (
                  <div
                    key={res.id}
                    className={`rounded-2xl border p-5 shadow-sm transition-all bg-white flex flex-col justify-between ${
                      res.is_overdue
                        ? "border-rose-300 bg-rose-50/20"
                        : isDeparted
                        ? "border-slate-200 bg-slate-50/40"
                        : "border-slate-200"
                    }`}
                  >
                    <div>
                      {/* Top Bar: Booking Ref & Overdue / Departed Badge */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-forest">
                          {res.booking_reference}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {res.is_overdue && (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[0.65rem] font-bold text-rose-800 border border-rose-300">
                              Overdue Check-Out
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${
                              isDeparted
                                ? "bg-slate-100 text-slate-700"
                                : "bg-sky-100 text-sky-800"
                            }`}
                          >
                            {isDeparted ? "Departed" : "In-House"}
                          </span>
                        </div>
                      </div>

                      {/* Guest Info */}
                      <div className="mt-3">
                        <h3 className="font-serif text-base font-bold text-forest">{res.guest_name}</h3>
                        <p className="text-[0.7rem] text-stone-600">
                          {res.guest_email || "No email"} &bull; {res.guest_phone || "No phone"}
                        </p>
                      </div>

                      {/* Accommodation & Stay Info */}
                      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-forest">{res.room_name}</span>
                          <span className="capitalize text-[0.65rem] text-stone-600 font-medium">
                            {res.room_category}
                          </span>
                        </div>

                        {res.checked_in_at && (
                          <div className="text-[0.65rem] text-slate-600">
                            Checked In: {new Date(res.checked_in_at).toLocaleDateString()} at{" "}
                            {new Date(res.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}

                        <div className="border-t border-slate-200 pt-1.5 flex justify-between text-[0.7rem]">
                          <span className="text-stone-600">Checkout Schedule:</span>
                          <span className="font-medium text-slate-800">12:00 PM (Noon)</span>
                        </div>
                      </div>

                      {/* Payment Clearance Badge */}
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-[0.7rem] text-stone-600 font-semibold uppercase">Account Settlement:</span>
                        {res.has_outstanding_balance ? (
                          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[0.7rem] font-bold text-rose-800 border border-rose-300">
                            Unsettled: {formatPhp(res.remaining_balance_php)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[0.7rem] font-semibold text-emerald-800 border border-emerald-300">
                            Fully Settled
                          </span>
                        )}
                      </div>

                      {/* Checked-out timestamp */}
                      {res.checked_out_at && (
                        <div className="mt-2 text-[0.65rem] text-slate-600 bg-slate-100 rounded-lg p-2">
                          Departed on: {new Date(res.checked_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {res.checked_out_by && ` processed by ${res.checked_out_by.name}`}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action */}
                    <div className="mt-5 border-t border-slate-100 pt-3">
                      {!isDeparted ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCheckOutRes(res);
                            setCheckOutNotes(res.check_out_notes || "");
                            setAcknowledgeBalanceOut(false);
                            setCheckOutModalOpen(true);
                            setCheckOutError(null);
                          }}
                          className="w-full rounded-xl bg-forest py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gold hover:bg-forest-dark transition-colors shadow-sm"
                        >
                          Process Check-Out
                        </button>
                      ) : (
                        <span className="block w-full py-2 text-center text-xs font-medium text-stone-600 italic">
                          Stay Completed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ==================== TAB 3: IN-HOUSE GUESTS ==================== */
        <div className="space-y-4">
          {(!overviewData?.in_house || overviewData.in_house.length === 0) ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <DoorIcon className="h-10 w-10 text-stone-600" />
              <h3 className="mt-2 font-serif text-lg font-bold text-forest">No In-House Guests</h3>
              <p className="text-xs text-stone-600">There are currently no checked-in guests occupying resort units.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-stone-600 font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3">Booking Ref</th>
                      <th className="px-4 py-3">Guest Name</th>
                      <th className="px-4 py-3">Accommodation</th>
                      <th className="px-4 py-3">Checked-In At</th>
                      <th className="px-4 py-3">Departure Date</th>
                      <th className="px-4 py-3">Balance Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overviewData.in_house.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-forest">
                          {res.booking_reference}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{res.guest_name}</p>
                          <p className="text-[0.65rem] text-stone-600">{res.guest_phone || res.guest_email}</p>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {res.room_name} ({res.room_category})
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {res.checked_in_at ? new Date(res.checked_in_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "N/A"}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-slate-800">
                          {formatDisplayDate(res.check_out)}
                        </td>
                        <td className="px-4 py-3">
                          {res.has_outstanding_balance ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold text-amber-800">
                              Due: {formatPhp(res.remaining_balance_php)}
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-800">
                              Paid in Full
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCheckOutRes(res);
                              setCheckOutNotes("");
                              setAcknowledgeBalanceOut(false);
                              setCheckOutModalOpen(true);
                              setCheckOutError(null);
                            }}
                            className="rounded-lg bg-forest/10 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-forest/20 transition-colors"
                          >
                            Check-Out
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL: PROCESS CHECK-IN
          ======================================================== */}
      {checkInModalOpen && selectedCheckInRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setCheckInModalOpen(false)}
          />

          <div className="relative z-50 w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="border-b border-slate-200 bg-forest p-6 text-white flex items-center justify-between">
              <div>
                <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-gold">
                  Guest Registration
                </span>
                <h3 className="font-serif text-xl font-bold">
                  Check-In: {selectedCheckInRes.booking_reference}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckInModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleConfirmCheckIn} className="p-6 space-y-4 text-xs overflow-y-auto">
              {checkInError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
                  {checkInError}
                </div>
              )}

              {/* Guest & Room Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-serif text-base font-bold text-forest">
                    {selectedCheckInRes.guest_name}
                  </span>
                  <span className="rounded bg-forest/10 px-2 py-0.5 text-[0.65rem] font-semibold text-forest uppercase">
                    {selectedCheckInRes.room_category}
                  </span>
                </div>
                <div className="text-slate-600 text-[0.7rem] space-y-0.5">
                  <p>Room: <strong className="text-slate-800">{selectedCheckInRes.room_name}</strong></p>
                  <p>Stay: {formatDisplayDate(selectedCheckInRes.check_in)} to {formatDisplayDate(selectedCheckInRes.check_out)} ({selectedCheckInRes.nights} nights)</p>
                  <p>Guests: {selectedCheckInRes.total_guests} ({selectedCheckInRes.adults} Adults, {selectedCheckInRes.children} Children)</p>
                </div>
              </div>

              {/* Room Readiness Check */}
              <div className="rounded-xl border border-slate-200 p-3 flex items-center justify-between">
                <span className="font-semibold text-slate-700">Housekeeping Status:</span>
                {selectedCheckInRes.is_room_ready ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 text-xs">
                    <SparklesIcon className="h-4 w-4 text-emerald-600" />
                    Inspected & Ready for Arrival
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700 text-xs">
                    <InfoIcon className="h-4 w-4 text-amber-600" />
                    Condition: {selectedCheckInRes.room_housekeeping_status}
                  </span>
                )}
              </div>

              {/* Financial Verification */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                <span className="font-semibold text-stone-600 uppercase tracking-wider text-[0.65rem]">
                  Payment Clearance
                </span>
                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Total Reservation Price:</span>
                    <span className="font-medium text-slate-900">{formatPhp(selectedCheckInRes.total_price_php)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Verified Net Paid:</span>
                    <span className="font-medium text-emerald-700">{formatPhp(selectedCheckInRes.net_paid_php)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1 font-bold">
                    <span>Remaining Balance:</span>
                    <span className={selectedCheckInRes.remaining_balance_php > 0 ? "text-rose-700 font-bold" : "text-emerald-700"}>
                      {formatPhp(selectedCheckInRes.remaining_balance_php)}
                    </span>
                  </div>
                </div>

                {/* Outstanding balance warning & acknowledgment */}
                {selectedCheckInRes.remaining_balance_php > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <p className="text-amber-800 font-medium leading-relaxed">
                      This reservation has an outstanding balance of <strong>{formatPhp(selectedCheckInRes.remaining_balance_php)}</strong>.
                    </p>
                    <label className="flex items-start gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={acknowledgeBalanceIn}
                        onChange={(e) => setAcknowledgeBalanceIn(e.target.checked)}
                        className="mt-0.5 rounded border-amber-400 text-forest focus:ring-forest"
                      />
                      <span className="text-[0.7rem] text-amber-900 font-semibold">
                        I acknowledge the outstanding balance and authorize check-in.
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Check-In Notes */}
              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Registration Notes / Keycard Details
                </label>
                <textarea
                  rows={3}
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  placeholder="e.g. Passport verified, Keycard #204 issued, vehicle plate #..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="border-t border-slate-200 pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={checkInSubmitting}
                  className="flex-1 rounded-xl bg-forest py-2.5 text-center font-semibold uppercase tracking-wider text-gold hover:bg-forest-dark transition-colors disabled:opacity-50"
                >
                  {checkInSubmitting ? "Completing Check-In..." : "Confirm & Check In Guest"}
                </button>
                <button
                  type="button"
                  onClick={() => setCheckInModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PROCESS CHECK-OUT
          ======================================================== */}
      {checkOutModalOpen && selectedCheckOutRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setCheckOutModalOpen(false)}
          />

          <div className="relative z-50 w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="border-b border-slate-200 bg-forest p-6 text-white flex items-center justify-between">
              <div>
                <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-gold">
                  Guest Departure
                </span>
                <h3 className="font-serif text-xl font-bold">
                  Check-Out: {selectedCheckOutRes.booking_reference}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckOutModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleConfirmCheckOut} className="p-6 space-y-4 text-xs overflow-y-auto">
              {checkOutError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
                  {checkOutError}
                </div>
              )}

              {/* Guest & Stay Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-serif text-base font-bold text-forest">
                    {selectedCheckOutRes.guest_name}
                  </span>
                  <span className="rounded bg-forest/10 px-2 py-0.5 text-[0.65rem] font-semibold text-forest uppercase">
                    {selectedCheckOutRes.room_name}
                  </span>
                </div>
                <div className="text-slate-600 text-[0.7rem] space-y-0.5">
                  <p>Checked In: {selectedCheckOutRes.checked_in_at ? new Date(selectedCheckOutRes.checked_in_at).toLocaleString() : "Recorded"}</p>
                  <p>Departure Date: {formatDisplayDate(selectedCheckOutRes.check_out)}</p>
                </div>
              </div>

              {/* Overdue Warning */}
              {selectedCheckOutRes.is_overdue && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ClockIcon className="h-4 w-4 text-rose-600" />
                    Late Checkout Detected
                  </div>
                  <p className="text-[0.7rem] leading-relaxed">
                    This departure has passed the resort 12:00 PM cutoff time. Coordinate keycard retrieval and luggage assistance.
                  </p>
                </div>
              )}

              {/* Financial Settlement */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                <span className="font-semibold text-stone-600 uppercase tracking-wider text-[0.65rem]">
                  Folio Settlement
                </span>
                <div className="flex justify-between font-bold text-xs pt-1">
                  <span>Outstanding Balance:</span>
                  <span className={selectedCheckOutRes.remaining_balance_php > 0 ? "text-rose-700" : "text-emerald-700"}>
                    {formatPhp(selectedCheckOutRes.remaining_balance_php)}
                  </span>
                </div>

                {selectedCheckOutRes.remaining_balance_php > 0 && (
                  <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-3 space-y-2">
                    <p className="text-rose-800 font-medium">
                      Unsettled folio balance of <strong>{formatPhp(selectedCheckOutRes.remaining_balance_php)}</strong> remains on file.
                    </p>
                    <label className="flex items-start gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={acknowledgeBalanceOut}
                        onChange={(e) => setAcknowledgeBalanceOut(e.target.checked)}
                        className="mt-0.5 rounded border-rose-400 text-forest focus:ring-forest"
                      />
                      <span className="text-[0.7rem] text-rose-900 font-semibold">
                        I acknowledge the balance is handled / billed to company and proceed with check-out.
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Housekeeping Notice */}
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-sky-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <SparklesIcon className="h-4 w-4 text-sky-700" />
                  Housekeeping Turnover Automation
                </div>
                <p className="text-[0.7rem] leading-relaxed">
                  Finalizing this checkout will automatically transition <strong>{selectedCheckOutRes.room_name}</strong> to <strong>Dirty</strong> condition and schedule a turnover cleaning task.
                </p>
              </div>

              {/* Check-Out Notes */}
              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Departure Notes / Minibar Checklist
                </label>
                <textarea
                  rows={3}
                  value={checkOutNotes}
                  onChange={(e) => setCheckOutNotes(e.target.value)}
                  placeholder="e.g. Keycards returned, room inspection clear, guest feedback..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="border-t border-slate-200 pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={checkOutSubmitting}
                  className="flex-1 rounded-xl bg-forest py-2.5 text-center font-semibold uppercase tracking-wider text-gold hover:bg-forest-dark transition-colors disabled:opacity-50"
                >
                  {checkOutSubmitting ? "Finalizing Check-Out..." : "Confirm & Check Out Guest"}
                </button>
                <button
                  type="button"
                  onClick={() => setCheckOutModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
