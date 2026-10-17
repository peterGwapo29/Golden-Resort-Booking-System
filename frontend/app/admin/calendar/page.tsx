"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  getAdminCalendarSchedule,
  checkAdminRoomAvailability,
  type CalendarScheduleResponse,
  type CalendarAccommodation,
  type CalendarReservationBar,
  type QuickCheckResponse,
} from "@/lib/admin-api";
import { formatPhp, formatDisplayDate } from "@/lib/booking-utils";
import {
  CalendarIcon,
  SearchIcon,
  FilterIcon,
  CloseIcon,
  InfoIcon,
  DoorIcon,
  BedIcon,
  UsersIcon,
  CheckIcon,
} from "@/components/ui/Icons";

export default function AdminCalendarPage() {
  // Current active date view (Year and Month)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<"timeline" | "month">("timeline");

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Loading & Data State
  const [scheduleData, setScheduleData] = useState<CalendarScheduleResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Drawer / Modal for Reservation Detail
  const [selectedReservation, setSelectedReservation] = useState<CalendarReservationBar | null>(null);

  // Quick Availability Check Modal State
  const [quickCheckOpen, setQuickCheckOpen] = useState<boolean>(false);
  const [qcCheckIn, setQcCheckIn] = useState<string>("");
  const [qcCheckOut, setQcCheckOut] = useState<string>("");
  const [qcRoomId, setQcRoomId] = useState<string>("all");
  const [qcLoading, setQcLoading] = useState<boolean>(false);
  const [qcResult, setQcResult] = useState<QuickCheckResponse | null>(null);
  const [qcError, setQcError] = useState<string | null>(null);

  // Compute month start and end dates in YYYY-MM-DD
  const { startDateStr, endDateStr, monthTitle, daysInMonth } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    const startMonth = String(month + 1).padStart(2, "0");
    const endDay = String(end.getDate()).padStart(2, "0");

    const startStr = `${year}-${startMonth}-01`;
    const endStr = `${year}-${startMonth}-${endDay}`;

    const title = new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(start);

    // List of day numbers in this month
    const days: { dateStr: string; dayNum: number; dayOfWeek: string; isWeekend: boolean }[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let d = 1; d <= end.getDate(); d++) {
      const cur = new Date(year, month, d);
      const curDayStr = `${year}-${startMonth}-${String(d).padStart(2, "0")}`;
      const dow = cur.getDay();
      days.push({
        dateStr: curDayStr,
        dayNum: d,
        dayOfWeek: dayNames[dow],
        isWeekend: dow === 0 || dow === 6,
      });
    }

    return {
      startDateStr: startStr,
      endDateStr: endStr,
      monthTitle: title,
      daysInMonth: days,
    };
  }, [currentDate]);

  // Fetch Calendar Schedule
  const fetchSchedule = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getAdminCalendarSchedule({
        start_date: startDateStr,
        end_date: endDateStr,
        category: selectedCategory,
        room_id: selectedRoomId,
        status: selectedStatus,
      });
      setScheduleData(res);
    } catch (err: any) {
      console.error("Failed to load schedule:", err);
      setErrorMessage(err.message || "Failed to load room availability schedule.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [startDateStr, endDateStr, selectedCategory, selectedRoomId, selectedStatus]);

  // Handlers for month navigation
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Quick Check Handler
  const handleRunQuickCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcCheckIn || !qcCheckOut) {
      setQcError("Please provide both check-in and check-out dates.");
      return;
    }
    if (qcCheckOut <= qcCheckIn) {
      setQcError("Check-out date must be strictly after check-in date.");
      return;
    }

    setQcLoading(true);
    setQcError(null);
    try {
      const res = await checkAdminRoomAvailability({
        check_in: qcCheckIn,
        check_out: qcCheckOut,
        room_id: qcRoomId !== "all" ? qcRoomId : undefined,
      });
      setQcResult(res);
    } catch (err: any) {
      setQcError(err.message || "Failed to check room availability.");
    } finally {
      setQcLoading(false);
    }
  };

  // Helper for reservation badge colors
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "completed":
        return "bg-forest/10 text-forest border-forest/30";
      case "cancelled":
        return "bg-slate-100 text-slate-500 border-slate-300 line-through";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const getPaymentBadgeClass = (payStatus: string) => {
    switch (payStatus) {
      case "paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "partially_paid":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "unpaid":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Today in YYYY-MM-DD
  const todayStr = useMemo(() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-forest/10 text-forest">
              <CalendarIcon className="h-5 w-5 text-forest" />
            </span>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-forest sm:text-3xl">
              Room Availability Calendar
            </h1>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            Real-time accommodation scheduling, occupancy rates, and double-booking conflict prevention.
          </p>
        </div>

        {/* Quick Check Action Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setQuickCheckOpen(true);
              setQcResult(null);
              setQcError(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gold shadow-sm hover:bg-forest-dark transition-colors"
          >
            <SearchIcon className="h-4 w-4" />
            Quick Availability Check
          </button>
        </div>
      </div>

      {/* Financial & Occupancy Summary Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600">
            Accommodations
          </span>
          <p className="mt-1 font-serif text-2xl font-bold text-forest">
            {scheduleData?.metrics?.total_accommodations ?? "..."}
          </p>
          <span className="text-[0.7rem] text-stone-600">Active resort types</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600">
            Total Capacity
          </span>
          <p className="mt-1 font-serif text-2xl font-bold text-forest">
            {scheduleData?.metrics?.total_capacity_units ?? "..."}
            <span className="ml-1 text-xs font-normal text-stone-600">units</span>
          </p>
          <span className="text-[0.7rem] text-stone-600">Physical bookable units</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600">
            Reservations
          </span>
          <p className="mt-1 font-serif text-2xl font-bold text-forest">
            {scheduleData?.metrics?.total_reservations ?? "..."}
          </p>
          <span className="text-[0.7rem] text-stone-600">Bookings in month</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-emerald-700">
            Arrivals (Check-Ins)
          </span>
          <p className="mt-1 font-serif text-2xl font-bold text-emerald-700">
            {scheduleData?.metrics?.arrivals_in_range ?? "..."}
          </p>
          <span className="text-[0.7rem] text-emerald-600">Scheduled arrivals</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-amber-700">
            Departures (Check-Outs)
          </span>
          <p className="mt-1 font-serif text-2xl font-bold text-amber-700">
            {scheduleData?.metrics?.departures_in_range ?? "..."}
          </p>
          <span className="text-[0.7rem] text-amber-600">Scheduled departures</span>
        </div>
      </div>

      {/* Control Bar: Month Navigation, Filters, and View Switcher */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
              title="Previous Month"
            >
              &larr;
            </button>

            <span className="min-w-[170px] text-center font-serif text-lg font-bold text-forest">
              {monthTitle}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
              title="Next Month"
            >
              &rarr;
            </button>

            <button
              type="button"
              onClick={handleCurrentMonth}
              className="ml-1 rounded-lg border border-forest/20 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-forest/5 transition-colors"
            >
              Today
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-stone-600">View Mode:</span>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "timeline"
                    ? "bg-forest text-gold shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Timeline (Gantt)
              </button>
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "month"
                    ? "bg-forest text-gold shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Monthly Grid
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs">
          <div className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4 text-stone-600" />
            <span className="font-semibold text-stone-600 uppercase tracking-wider">Filters:</span>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-forest focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="room">Rooms</option>
            <option value="suite">Suites</option>
            <option value="villa">Villas</option>
          </select>

          {/* Accommodation Filter */}
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-forest focus:outline-none"
          >
            <option value="all">All Accommodations</option>
            {scheduleData?.accommodations?.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} ({room.total_inventory} units)
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-forest focus:outline-none"
          >
            <option value="all">All Booking Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Legend Guide */}
          <div className="ml-auto flex flex-wrap items-center gap-3 text-[0.7rem] text-stone-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Partially Booked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-600" /> Fully Booked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Blocked
            </span>
          </div>
        </div>
      </div>

      {/* Main Calendar View Area */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-forest border-t-gold" />
          <p className="mt-3 text-xs font-medium text-stone-600">
            Loading accommodation schedule and reservations...
          </p>
        </div>
      ) : scheduleData?.accommodations?.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <DoorIcon className="h-10 w-10 text-stone-600" />
          <h3 className="mt-2 font-serif text-lg font-bold text-forest">No Accommodations Found</h3>
          <p className="text-xs text-stone-600">Try adjusting your category or accommodation filters.</p>
        </div>
      ) : viewMode === "timeline" ? (
        /* TIMELINE (GANTT) VIEW */
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                {/* Dates Header Row */}
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 z-20 w-64 min-w-[250px] border-r border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-forest shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                    Accommodation
                  </th>
                  {daysInMonth.map((day) => {
                    const isToday = day.dateStr === todayStr;
                    return (
                      <th
                        key={day.dateStr}
                        className={`min-w-[44px] border-r border-slate-200 px-1 py-2 text-center transition-colors ${
                          isToday
                            ? "bg-gold/20 font-bold text-forest"
                            : day.isWeekend
                            ? "bg-slate-100/70 text-slate-700"
                            : "text-slate-600"
                        }`}
                      >
                        <div className="text-[0.65rem] uppercase tracking-wider text-stone-600">
                          {day.dayOfWeek}
                        </div>
                        <div
                          className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                            isToday ? "bg-forest font-bold text-gold" : ""
                          }`}
                        >
                          {day.dayNum}
                        </div>
                      </th>
                    );
                  })}
                </tr>

                {/* Overall Resort Occupancy Summary Row */}
                <tr className="border-b border-slate-200 bg-ivory/40">
                  <th className="sticky left-0 z-20 border-r border-slate-200 bg-slate-100/90 px-4 py-2 text-[0.75rem] font-semibold text-forest uppercase tracking-wider shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                    Resort Occupancy
                  </th>
                  {daysInMonth.map((day) => {
                    const summary = scheduleData?.daily_summaries?.[day.dateStr];
                    const occupied = summary?.occupied_units ?? 0;
                    const capacity = summary?.total_capacity ?? 0;
                    const percent = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
                    return (
                      <td
                        key={day.dateStr}
                        className="border-r border-slate-200 px-1 py-1.5 text-center text-[0.65rem]"
                        title={`Occupied: ${occupied}/${capacity} (${percent}%) | Arrivals: ${summary?.arrivals ?? 0} | Departures: ${summary?.departures ?? 0}`}
                      >
                        <span
                          className={`inline-block font-semibold ${
                            percent >= 100
                              ? "text-rose-700"
                              : percent > 50
                              ? "text-amber-700"
                              : "text-forest"
                          }`}
                        >
                          {occupied}/{capacity}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {scheduleData?.accommodations.map((room) => {
                  const scheduleMap = new Map(room.schedule.map((s) => [s.date, s]));
                  // Filter reservations belonging to this room
                  const roomReservations = (scheduleData.reservations || []).filter(
                    (r) => r.room_id === room.id
                  );

                  return (
                    <React.Fragment key={room.id}>
                      {/* Room Inventory Availability Row */}
                      <tr className="border-b border-slate-200 hover:bg-slate-50/60 transition-colors">
                        <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-4 py-3 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-forest">{room.name}</p>
                              <div className="mt-0.5 flex items-center gap-2 text-[0.7rem] text-stone-600">
                                <span className="capitalize">{room.category}</span>
                                <span>&bull;</span>
                                <span>{room.total_inventory} {room.total_inventory > 1 ? "units" : "unit"}</span>
                              </div>
                            </div>
                            <span className="font-mono text-xs font-semibold text-forest-dark">
                              {formatPhp(room.nightly_rate_php)}
                            </span>
                          </div>
                        </td>

                        {daysInMonth.map((day) => {
                          const slot = scheduleMap.get(day.dateStr);
                          const isToday = day.dateStr === todayStr;

                          let bgClass = "bg-emerald-50/60 text-emerald-800";
                          let label = `${slot?.available_units ?? 0} left`;

                          if (slot?.status === "blocked") {
                            bgClass = "bg-slate-100 text-slate-500";
                            label = "Blocked";
                          } else if (slot?.status === "fully_booked") {
                            bgClass = "bg-rose-50 text-rose-800 font-bold";
                            label = "Full";
                          } else if (slot?.status === "partially_booked") {
                            bgClass = "bg-amber-50 text-amber-800 font-semibold";
                            label = `${slot?.available_units} / ${slot?.total_inventory}`;
                          }

                          return (
                            <td
                              key={day.dateStr}
                              className={`border-r border-slate-200 px-0.5 py-2 text-center transition-colors ${
                                isToday ? "ring-1 ring-inset ring-gold/40" : ""
                              }`}
                            >
                              <div
                                className={`mx-auto flex h-8 w-full flex-col items-center justify-center rounded text-[0.65rem] transition-colors ${bgClass}`}
                                title={`${room.name} on ${day.dateStr}: ${slot?.available_units} available out of ${slot?.total_inventory}`}
                              >
                                {label}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Room Active Reservation Spans (if any reservations exist for this room in this month) */}
                      {roomReservations.length > 0 && (
                        <tr className="border-b border-slate-100 bg-slate-50/40">
                          <td className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50/90 px-4 py-2 text-[0.7rem] font-medium text-stone-600 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                            <span className="italic">Bookings ({roomReservations.length}):</span>
                          </td>
                          <td colSpan={daysInMonth.length} className="px-2 py-2">
                            <div className="flex flex-wrap gap-2">
                              {roomReservations.map((res) => (
                                <button
                                  key={res.id}
                                  type="button"
                                  onClick={() => setSelectedReservation(res)}
                                  className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs shadow-xs transition-transform hover:scale-[1.02] ${getStatusBadgeClass(
                                    res.status
                                  )}`}
                                >
                                  <span className="font-semibold">{res.booking_reference}</span>
                                  <span className="text-stone-600">&bull;</span>
                                  <span className="max-w-[130px] truncate">{res.guest_name}</span>
                                  <span className="text-stone-600">&bull;</span>
                                  <span className="font-mono text-[0.65rem]">
                                    {formatDisplayDate(res.check_in)} &rarr; {formatDisplayDate(res.check_out)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MONTHLY GRID VIEW */
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 border-b border-slate-200 pb-2 text-center text-xs font-semibold uppercase tracking-wider text-forest">
            {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 auto-rows-fr gap-px bg-slate-200 pt-px">
            {/* Blank cells for offset at start of month */}
            {Array.from({
              length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(),
            }).map((_, i) => (
              <div key={`blank-${i}`} className="min-h-[110px] bg-slate-50/50 p-2" />
            ))}

            {/* Day Cells */}
            {daysInMonth.map((day) => {
              const summary = scheduleData?.daily_summaries?.[day.dateStr];
              const isToday = day.dateStr === todayStr;

              // Reservations checking in or out or staying this day
              const dayArrivals = (scheduleData?.reservations || []).filter(
                (r) => r.check_in === day.dateStr && r.status !== "cancelled"
              );
              const dayDepartures = (scheduleData?.reservations || []).filter(
                (r) => r.check_out === day.dateStr && r.status !== "cancelled"
              );

              return (
                <div
                  key={day.dateStr}
                  className={`min-h-[120px] bg-white p-2 flex flex-col justify-between transition-colors hover:bg-slate-50/80 ${
                    isToday ? "ring-2 ring-inset ring-gold bg-gold/5" : ""
                  }`}
                >
                  <div>
                    {/* Header: Day number & Occupancy */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          isToday ? "bg-forest text-gold" : "text-forest"
                        }`}
                      >
                        {day.dayNum}
                      </span>
                      {summary && summary.total_capacity > 0 && (
                        <span className="text-[0.65rem] font-semibold text-stone-600">
                          {summary.occupied_units}/{summary.total_capacity} occ
                        </span>
                      )}
                    </div>

                    {/* Arrivals Chip */}
                    {dayArrivals.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-emerald-800">
                          &darr; {dayArrivals.length} Check-In
                        </span>
                        {dayArrivals.slice(0, 2).map((res) => (
                          <button
                            key={`arr-${res.id}`}
                            type="button"
                            onClick={() => setSelectedReservation(res)}
                            className="block w-full truncate rounded bg-emerald-50 px-1.5 py-0.5 text-left text-[0.65rem] font-medium text-emerald-900 hover:bg-emerald-200 transition-colors"
                          >
                            {res.guest_name} ({res.room_name})
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Departures Chip */}
                    {dayDepartures.length > 0 && (
                      <div className="mt-1 space-y-1">
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-800">
                          &uarr; {dayDepartures.length} Check-Out
                        </span>
                        {dayDepartures.slice(0, 2).map((res) => (
                          <button
                            key={`dep-${res.id}`}
                            type="button"
                            onClick={() => setSelectedReservation(res)}
                            className="block w-full truncate rounded bg-amber-50 px-1.5 py-0.5 text-left text-[0.65rem] font-medium text-amber-900 hover:bg-amber-200 transition-colors"
                          >
                            {res.guest_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Summary bar at bottom */}
                  <div className="mt-2 text-right">
                    <span className="text-[0.65rem] text-stone-600">
                      {summary?.occupied_units === 0 ? "All units free" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          RESERVATION DETAIL SLIDE-OVER DRAWER
          ======================================================== */}
      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedReservation(null)}
          />

          {/* Drawer Panel */}
          <div className="relative z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="border-b border-slate-200 bg-forest p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-gold">
                    Reservation Details
                  </span>
                  <h3 className="font-serif text-xl font-bold">
                    {selectedReservation.booking_reference}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReservation(null)}
                  className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Status Badges */}
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${getStatusBadgeClass(
                    selectedReservation.status
                  )}`}
                >
                  {selectedReservation.status}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${getPaymentBadgeClass(
                    selectedReservation.payment_status
                  )}`}
                >
                  {selectedReservation.payment_status.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 space-y-5 p-6 text-xs">
              {/* Guest Information */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <h4 className="font-semibold uppercase tracking-wider text-stone-600">
                  Guest Contact
                </h4>
                <p className="font-serif text-base font-bold text-forest">
                  {selectedReservation.guest_name}
                </p>
                <div className="text-slate-600 space-y-1">
                  <p>Email: {selectedReservation.guest_email || "N/A"}</p>
                  <p>Phone: {selectedReservation.guest_phone || "N/A"}</p>
                  <p>
                    Party: {selectedReservation.adults} Adults
                    {selectedReservation.children > 0 && `, ${selectedReservation.children} Children`} (
                    {selectedReservation.total_guests} total)
                  </p>
                </div>
              </div>

              {/* Accommodation & Stay */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <h4 className="font-semibold uppercase tracking-wider text-stone-600">
                  Stay Schedule
                </h4>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-forest text-sm">
                    {selectedReservation.room_name}
                  </span>
                  <span className="rounded bg-forest/10 px-2 py-0.5 text-[0.65rem] font-semibold text-forest uppercase">
                    {selectedReservation.room_category}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[0.65rem] text-stone-600 uppercase">Check-In</span>
                    <p className="font-bold text-forest text-sm">
                      {formatDisplayDate(selectedReservation.check_in)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[0.65rem] text-stone-600 uppercase">Check-Out</span>
                    <p className="font-bold text-forest text-sm">
                      {formatDisplayDate(selectedReservation.check_out)}
                    </p>
                  </div>
                </div>
                <p className="text-[0.7rem] text-stone-600 font-medium">
                  Stay Duration: {selectedReservation.nights} {selectedReservation.nights === 1 ? "night" : "nights"}
                </p>
              </div>

              {/* Financial Snapshot */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <h4 className="font-semibold uppercase tracking-wider text-stone-600">
                  Financial Status
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Price:</span>
                    <span className="font-bold text-forest">
                      {formatPhp(selectedReservation.total_price_php)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Net Paid:</span>
                    <span className="font-semibold text-emerald-700">
                      {formatPhp(selectedReservation.net_paid_php)}
                    </span>
                  </div>
                  {selectedReservation.refunded_php > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Refunded:</span>
                      <span className="font-semibold text-amber-700">
                        {formatPhp(selectedReservation.refunded_php)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-100 pt-1.5">
                    <span className="font-semibold text-slate-700">Remaining Balance:</span>
                    <span
                      className={`font-bold ${
                        selectedReservation.remaining_balance_php > 0
                          ? "text-rose-700"
                          : "text-emerald-700"
                      }`}
                    >
                      {formatPhp(selectedReservation.remaining_balance_php)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Special Requests */}
              {selectedReservation.special_requests && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Special Requests
                  </h4>
                  <p className="italic text-slate-700">
                    &ldquo;{selectedReservation.special_requests}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="border-t border-slate-200 bg-slate-50 p-4 flex gap-3">
              <Link
                href={`/admin/reservations`}
                className="flex-1 rounded-xl bg-forest py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gold hover:bg-forest-dark transition-colors"
              >
                Go to Reservations
              </Link>
              <button
                type="button"
                onClick={() => setSelectedReservation(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          QUICK AVAILABILITY CHECK MODAL
          ======================================================== */}
      {quickCheckOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setQuickCheckOpen(false)}
          />

          <div className="relative z-50 w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="border-b border-slate-200 bg-forest p-6 text-white flex items-center justify-between">
              <div>
                <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-gold">
                  Conflict Detector & Verification
                </span>
                <h3 className="font-serif text-xl font-bold">Quick Availability Check</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickCheckOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              <form onSubmit={handleRunQuickCheck} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                      Check-In Date *
                    </label>
                    <input
                      type="date"
                      value={qcCheckIn}
                      onChange={(e) => setQcCheckIn(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                      Check-Out Date *
                    </label>
                    <input
                      type="date"
                      value={qcCheckOut}
                      onChange={(e) => setQcCheckOut(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                      Room Filter (Optional)
                    </label>
                    <select
                      value={qcRoomId}
                      onChange={(e) => setQcRoomId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                    >
                      <option value="all">All Active Rooms</option>
                      {scheduleData?.accommodations?.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {qcError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
                    {qcError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={qcLoading}
                  className="w-full rounded-xl bg-forest py-2.5 text-center font-semibold uppercase tracking-wider text-gold hover:bg-forest-dark transition-colors disabled:opacity-50"
                >
                  {qcLoading ? "Analyzing Schedule & Overlaps..." : "Verify Dates & Detect Conflicts"}
                </button>
              </form>

              {/* Results Presentation */}
              {qcResult && (
                <div className="border-t border-slate-200 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-forest text-sm">
                      Check Results ({qcResult.nights} Nights: {formatDisplayDate(qcResult.check_in)} to {formatDisplayDate(qcResult.check_out)})
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        qcResult.has_available_rooms
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {qcResult.has_available_rooms ? "Accommodations Available" : "All Accommodations Sold Out"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {qcResult.rooms.map((room) => (
                      <div
                        key={room.room_id}
                        className={`rounded-xl border p-4 ${
                          room.is_available
                            ? "border-emerald-200 bg-emerald-50/30"
                            : "border-rose-200 bg-rose-50/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-forest text-sm">{room.name}</h4>
                            <span className="text-[0.7rem] text-stone-600 capitalize">
                              {room.category} &bull; Total Inventory: {room.total_inventory}
                            </span>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                room.is_available
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {room.is_available
                                ? `${room.available_units} Unit${room.available_units > 1 ? "s" : ""} Available`
                                : "Conflict: Fully Booked"}
                            </span>
                            <p className="mt-0.5 font-mono text-[0.7rem] text-slate-600">
                              {formatPhp(room.nightly_rate_php)} / night
                            </p>
                          </div>
                        </div>

                        {/* Overlapping conflicts info */}
                        {room.overlapping_reservations.length > 0 && (
                          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
                            <span className="font-semibold text-stone-600 uppercase tracking-wider text-[0.65rem]">
                              Overlapping Bookings Detected ({room.overlapping_reservations.length}):
                            </span>
                            {room.overlapping_reservations.map((overlap) => (
                              <div
                                key={overlap.id}
                                className="flex items-center justify-between border-t border-slate-100 pt-1 text-[0.7rem]"
                              >
                                <span className="font-medium text-forest">
                                  {overlap.booking_reference} &mdash; {overlap.guest_name}
                                </span>
                                <span className="font-mono text-slate-600">
                                  {formatDisplayDate(overlap.check_in)} to {formatDisplayDate(overlap.check_out)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 bg-slate-50 p-4 text-right">
              <button
                type="button"
                onClick={() => setQuickCheckOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
