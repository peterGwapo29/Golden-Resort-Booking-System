"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  getDashboardStats,
  getAdminAnalytics,
  downloadAdminAnalyticsCsv,
  type DashboardMetrics,
  type AdminAnalyticsResponse,
} from "@/lib/admin-api";
import { formatPhp, formatDisplayDate } from "@/lib/booking-utils";
import {
  DoorIcon,
  ClipboardListIcon,
  CreditCardIcon,
  CheckIcon,
  CalendarIcon,
  RefreshIcon,
  ArrowRightIcon,
  InfoIcon,
  DownloadIcon,
  PrinterIcon,
  ChartBarIcon,
  KeyIcon,
} from "@/components/ui/Icons";

export default function AdminDashboardPage() {
  // Operational dashboard stats & BI Analytics data
  const [dashboardData, setDashboardData] = useState<DashboardMetrics | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AdminAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date Range Controls
  const [preset, setPreset] = useState<"7d" | "30d" | "this_month" | "last_month" | "ytd" | "custom">("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  // Occupancy Trend view toggle
  const [trendView, setTrendView] = useState<"daily" | "weekly" | "monthly">("daily");

  const loadData = async (
    targetPreset = preset,
    start = customStart,
    end = customEnd
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashRes, analyticsRes] = await Promise.all([
        getDashboardStats(),
        getAdminAnalytics({
          preset: targetPreset,
          start_date: targetPreset === "custom" && start ? start : undefined,
          end_date: targetPreset === "custom" && end ? end : undefined,
        }),
      ]);
      setDashboardData(dashRes);
      setAnalyticsData(analyticsRes);

      if (targetPreset === "custom" && analyticsRes.range) {
        setCustomStart(analyticsRes.range.start_date);
        setCustomEnd(analyticsRes.range.end_date);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load operational metrics and analytics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePresetChange = (newPreset: "7d" | "30d" | "this_month" | "last_month" | "ytd" | "custom") => {
    setPreset(newPreset);
    if (newPreset !== "custom") {
      loadData(newPreset);
    }
  };

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      setError("Please specify both start date and end date.");
      return;
    }
    loadData("custom", customStart, customEnd);
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      await downloadAdminAnalyticsCsv({
        preset,
        start_date: preset === "custom" ? customStart : undefined,
        end_date: preset === "custom" ? customEnd : undefined,
      });
    } catch (err: any) {
      alert(err?.message || "Failed to download analytics CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading && !dashboardData) {
    return (
      <div className="py-24 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-forest border-t-gold" />
        <p className="mt-4 text-sm font-medium text-muted">
          Loading resort intelligence and operational metrics...
        </p>
      </div>
    );
  }

  if (error && !dashboardData && !analyticsData) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-8 text-center text-red-900">
        <InfoIcon className="mx-auto h-8 w-8 text-red-600" />
        <h2 className="mt-3 text-lg font-bold">Unable to Load Dashboard Intelligence</h2>
        <p className="mt-1 text-sm">{error}</p>
        <button
          type="button"
          onClick={() => loadData()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-semibold text-white hover:bg-forest-dark transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
        >
          <RefreshIcon className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const kpis = analyticsData?.kpis;
  const financials = analyticsData?.financials;
  const range = analyticsData?.range;
  const roomPerf = analyticsData?.room_type_performance || [];
  const trends = analyticsData?.occupancy_trends;

  return (
    <div className="space-y-8 print:space-y-4 print:text-black">
      {/* Top Header: Branding, Title & Quick Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200/80 pb-6 print:border-b-2 print:border-forest">
        <div>
          <span className="text-xs font-semibold tracking-wider text-gold uppercase">
            Business Intelligence &amp; Operations
          </span>
          <h2 className="font-serif text-3xl font-medium text-forest sm:text-4xl">
            Resort Analytics &amp; Reports
          </h2>
          <p className="text-xs text-muted mt-1 print:text-xs">
            {range ? (
              <>
                Reporting window: <strong className="text-forest font-semibold">{range.start_date}</strong> to{" "}
                <strong className="text-forest font-semibold">{range.end_date}</strong> ({range.days_count} days)
              </>
            ) : (
              "Live operational tracking and performance intelligence"
            )}
          </p>
        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-forest transition shadow-xs disabled:opacity-50"
            title="Download CSV Spreadsheet (RFC 4180)"
          >
            <DownloadIcon className="h-4 w-4 text-forest" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-forest transition shadow-xs"
            title="Print or Save PDF report"
          >
            <PrinterIcon className="h-4 w-4 text-forest" />
            Print / PDF
          </button>

          <button
            type="button"
            onClick={() => loadData()}
            className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-forest-dark transition shadow-xs"
          >
            <RefreshIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Date Range Selector Toolbar (Hidden on Print) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider shrink-0 mr-1">
              Period:
            </span>
            {(
              [
                { id: "7d", label: "Last 7 Days" },
                { id: "30d", label: "Last 30 Days" },
                { id: "this_month", label: "This Month" },
                { id: "last_month", label: "Last Month" },
                { id: "ytd", label: "Year to Date" },
                { id: "custom", label: "Custom Range" },
              ] as const
            ).map((p) => {
              const active = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetChange(p.id)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition shrink-0 ${
                    active
                      ? "bg-forest text-gold shadow-sm ring-1 ring-forest"
                      : "bg-slate-100 text-stone-700 hover:bg-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {preset === "custom" && (
            <form onSubmit={handleApplyCustomDates} className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs text-ink focus:border-forest focus:outline-none"
                required
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs text-ink focus:border-forest focus:outline-none"
                required
              />
              <button
                type="submit"
                className="rounded-lg bg-gold px-3 py-1 text-xs font-semibold text-forest-dark hover:bg-gold-light transition shadow-xs"
              >
                Apply
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Primary KPI Grid: Occupancy, Net Collections, ADR, ALOS */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Occupancy Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Occupancy Rate
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-700">
              <ChartBarIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="font-serif text-3xl font-semibold text-forest">
              {kpis?.occupancy_rate_percent.toFixed(1) ?? "0.0"}%
            </p>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (kpis?.occupancy_rate_percent ?? 0) >= 70
                  ? "bg-emerald-600"
                  : (kpis?.occupancy_rate_percent ?? 0) >= 40
                  ? "bg-amber-500"
                  : "bg-forest"
              }`}
              style={{ width: `${Math.min(100, kpis?.occupancy_rate_percent ?? 0)}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-muted">
            {kpis?.total_room_nights_occupied ?? 0} of {kpis?.total_room_nights_available ?? 0} room-nights occupied
          </div>
        </div>

        {/* Net Collections */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Net Collections
            </span>
            <div className="rounded-lg bg-gold/20 p-2 text-forest">
              <CreditCardIcon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 font-serif text-3xl font-semibold text-forest tabular-nums">
            {formatPhp(financials?.net_collections_php ?? 0)}
          </p>
          <div className="mt-2 text-xs text-muted truncate">
            {formatPhp(financials?.gross_collections_php ?? 0)} Gross &bull; -{formatPhp(financials?.completed_refunds_php ?? 0)} Refunds
          </div>
        </div>

        {/* Average Daily Rate (ADR) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Average Daily Rate (ADR)
            </span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-700">
              <DoorIcon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 font-serif text-3xl font-semibold text-forest tabular-nums">
            {formatPhp(kpis?.adr_php ?? 0)}
          </p>
          <div className="mt-2 text-xs text-muted">
            Revenue generated per occupied room-night
          </div>
        </div>

        {/* Average Length of Stay (ALOS) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Avg Length of Stay (ALOS)
            </span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-700">
              <CalendarIcon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 font-serif text-3xl font-semibold text-forest">
            {kpis?.alos_nights.toFixed(1) ?? "0.0"}{" "}
            <span className="text-sm font-normal text-muted">Nights</span>
          </p>
          <div className="mt-2 text-xs text-muted">
            Average duration per guest booking
          </div>
        </div>
      </div>

      {/* Booking Funnel & Conversion Health */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <span className="text-xs font-semibold tracking-wider text-gold uppercase">
              Reservations Funnel
            </span>
            <h3 className="font-serif text-xl font-medium text-forest">
              Booking Activity &amp; Attrition Analysis
            </h3>
          </div>
          <Link
            href="/admin/reservations"
            className="text-xs font-semibold text-forest hover:text-gold flex items-center gap-1 print:hidden"
          >
            Open All Reservations &rarr;
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-xs text-muted uppercase font-medium">Total Bookings</span>
            <p className="mt-1 font-serif text-2xl font-bold text-forest">
              {kpis?.total_bookings ?? 0}
            </p>
            <p className="text-[11px] text-muted mt-0.5">Created in period</p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <span className="text-xs text-emerald-800 uppercase font-medium">Confirmed / Stayed</span>
            <p className="mt-1 font-serif text-2xl font-bold text-emerald-800">
              {kpis?.confirmed_stays ?? 0}
            </p>
            <p className="text-[11px] text-emerald-700 mt-0.5">Active &amp; completed stays</p>
          </div>

          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
            <span className="text-xs text-rose-800 uppercase font-medium">Cancellations</span>
            <p className="mt-1 font-serif text-2xl font-bold text-rose-800">
              {kpis?.cancellations ?? 0}
            </p>
            <p className="text-[11px] text-rose-700 mt-0.5 font-medium">
              {kpis?.cancellation_rate_percent.toFixed(1) ?? "0.0"}% cancellation rate
            </p>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
            <span className="text-xs text-amber-800 uppercase font-medium">No-Shows</span>
            <p className="mt-1 font-serif text-2xl font-bold text-amber-800">
              {kpis?.no_shows ?? 0}
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5 font-medium">
              {kpis?.no_show_rate_percent.toFixed(1) ?? "0.0"}% no-show rate
            </p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <span className="text-xs text-blue-800 uppercase font-medium">Pending Approvals</span>
            <p className="mt-1 font-serif text-2xl font-bold text-blue-800">
              {kpis?.pending_bookings ?? 0}
            </p>
            <p className="text-[11px] text-blue-700 mt-0.5">Awaiting staff review</p>
          </div>
        </div>
      </div>

      {/* Occupancy Trends Visualizer (Day, Week, Month) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-gold uppercase">
              Capacity Utilization
            </span>
            <h3 className="font-serif text-xl font-medium text-forest">
              Occupancy Trends by {trendView === "daily" ? "Day" : trendView === "weekly" ? "Week" : "Month"}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Tracking physical accommodation occupancy rate curves across the selected period.
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold print:hidden">
            <button
              type="button"
              onClick={() => setTrendView("daily")}
              className={`rounded-lg px-3 py-1 transition ${
                trendView === "daily" ? "bg-white text-forest shadow-xs font-bold" : "text-muted hover:text-ink"
              }`}
            >
              Daily ({trends?.daily.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setTrendView("weekly")}
              className={`rounded-lg px-3 py-1 transition ${
                trendView === "weekly" ? "bg-white text-forest shadow-xs font-bold" : "text-muted hover:text-ink"
              }`}
            >
              Weekly ({trends?.weekly.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setTrendView("monthly")}
              className={`rounded-lg px-3 py-1 transition ${
                trendView === "monthly" ? "bg-white text-forest shadow-xs font-bold" : "text-muted hover:text-ink"
              }`}
            >
              Monthly ({trends?.monthly.length ?? 0})
            </button>
          </div>
        </div>

        {/* Daily Bar Chart View */}
        {trendView === "daily" && (
          <div className="mt-6 space-y-3">
            <div className="max-h-96 overflow-y-auto pr-1 space-y-2">
              {trends?.daily.map((d) => (
                <div key={d.date} className="flex items-center gap-3 text-xs">
                  <div className="w-24 shrink-0 font-medium text-ink tabular-nums">
                    {formatDisplayDate(d.date)}{" "}
                    <span className="text-[10px] text-muted">({d.day_of_week})</span>
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        d.occupancy_percent >= 75
                          ? "bg-emerald-600"
                          : d.occupancy_percent >= 40
                          ? "bg-amber-500"
                          : d.occupancy_percent > 0
                          ? "bg-forest"
                          : "bg-transparent"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(d.occupancy_percent > 0 ? 5 : 0, d.occupancy_percent))}%` }}
                    />
                  </div>
                  <div className="w-28 text-right shrink-0 tabular-nums">
                    <strong className="text-forest font-semibold">{d.occupancy_percent.toFixed(1)}%</strong>
                    <span className="text-[11px] text-muted ml-1">
                      ({d.occupied_units}/{d.total_capacity})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Rollup View */}
        {trendView === "weekly" && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trends?.weekly.map((w, idx) => (
              <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <span className="text-xs font-semibold text-forest">{w.label}</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-serif text-2xl font-bold text-forest">
                    {w.occupancy_percent.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted tabular-nums">
                    {w.occupied_nights} / {w.available_nights} nights
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      w.occupancy_percent >= 70 ? "bg-emerald-600" : "bg-forest"
                    }`}
                    style={{ width: `${Math.min(100, w.occupancy_percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Monthly Overview View */}
        {trendView === "monthly" && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trends?.monthly.map((m, idx) => (
              <div key={idx} className="rounded-xl border border-slate-100 bg-white p-5 shadow-xs">
                <span className="text-xs font-semibold text-gold uppercase tracking-wider">
                  {m.label}
                </span>
                <p className="mt-2 font-serif text-3xl font-bold text-forest">
                  {m.occupancy_percent.toFixed(1)}%
                </p>
                <div className="mt-2 text-xs text-muted">
                  {m.occupied_nights} occupied nights of {m.available_nights} capacity
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-forest"
                    style={{ width: `${Math.min(100, m.occupancy_percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Most-Booked Accommodation Types (Leaderboard) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <span className="text-xs font-semibold tracking-wider text-gold uppercase">
              Performance Ranking
            </span>
            <h3 className="font-serif text-xl font-medium text-forest">
              Most-Booked Accommodations Leaderboard
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Ranked by total accommodation revenue and room-nights sold in selected period.
            </p>
          </div>
          <Link
            href="/admin/rooms"
            className="text-xs font-semibold text-forest hover:text-gold flex items-center gap-1 print:hidden"
          >
            Manage Accommodations &rarr;
          </Link>
        </div>

        {roomPerf.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted">
            No accommodation data available for this range.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs font-semibold text-muted uppercase">
                <tr>
                  <th className="py-3 px-3">Rank &amp; Accommodation</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-center">Physical Units</th>
                  <th className="py-3 px-3 text-center">Bookings</th>
                  <th className="py-3 px-3 text-center">Nights Sold</th>
                  <th className="py-3 px-3 text-right">Revenue (PHP)</th>
                  <th className="py-3 px-3 text-right">Occupancy (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roomPerf.map((r, idx) => (
                  <tr key={r.room_id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-medium text-ink flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          idx === 0
                            ? "bg-gold text-forest-dark"
                            : idx === 1
                            ? "bg-slate-200 text-slate-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-serif font-semibold text-forest">{r.name}</span>
                        {!r.is_active && (
                          <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-muted capitalize">{r.category}</td>
                    <td className="py-3 px-3 text-center tabular-nums">{r.total_inventory}</td>
                    <td className="py-3 px-3 text-center font-semibold text-forest tabular-nums">
                      {r.bookings_count}
                    </td>
                    <td className="py-3 px-3 text-center tabular-nums">{r.nights_sold}</td>
                    <td className="py-3 px-3 text-right font-serif font-bold text-forest tabular-nums">
                      {formatPhp(r.revenue_php)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-700 tabular-nums">
                      {r.occupancy_percent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Financial Operations Reconciliation (5 Authoritative Server-Driven Metrics) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <span className="text-xs font-semibold tracking-wider text-gold uppercase">
              Financial Reconciliation
            </span>
            <h3 className="font-serif text-xl font-medium text-forest">
              Authoritative Collections &amp; Receivables
            </h3>
          </div>
          <Link
            href="/admin/payments"
            className="text-xs font-semibold text-forest hover:text-gold flex items-center gap-1 print:hidden"
          >
            Manage Verified Payments &rarr;
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Net Collections */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Net Collections
            </span>
            <p className="mt-2 font-serif text-2xl font-bold text-forest tabular-nums">
              {formatPhp(financials?.net_collections_php ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-emerald-700">
              Gross Collections less Completed Refunds
            </p>
          </div>

          {/* Gross Collections */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Gross Collections
            </span>
            <p className="mt-2 font-serif text-2xl font-bold text-forest tabular-nums">
              {formatPhp(financials?.gross_collections_php ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Total completed receipts in period
            </p>
          </div>

          {/* Completed Refunds */}
          <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
            <span className="text-xs font-semibold text-purple-800 uppercase tracking-wider">
              Completed Refunds
            </span>
            <p className="mt-2 font-serif text-2xl font-bold text-purple-900 tabular-nums">
              {formatPhp(financials?.completed_refunds_php ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-purple-700">
              Approved reversals &amp; refunds
            </p>
          </div>

          {/* Outstanding Balances */}
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
              Outstanding Balances
            </span>
            <p className="mt-2 font-serif text-2xl font-bold text-rose-900 tabular-nums">
              {formatPhp(financials?.outstanding_balances_php ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-rose-700">
              Active unpaid reservation balances
            </p>
          </div>
        </div>
      </div>

      {/* Front Desk & Operations Shortcuts (Hidden on Print) */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <Link
          href="/admin/check-in-out"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-gold transition flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-semibold text-muted uppercase">Today&apos;s Arrivals</span>
            <p className="mt-2 font-serif text-2xl font-bold text-forest">
              {dashboardData?.metrics.today.check_ins ?? 0}
            </p>
            <span className="mt-1 text-xs text-forest group-hover:text-gold flex items-center gap-1 font-medium">
              Front Desk Workspace &rarr;
            </span>
          </div>
          <div className="rounded-xl bg-forest/10 p-3 text-forest">
            <KeyIcon className="h-6 w-6" />
          </div>
        </Link>

        <Link
          href="/admin/calendar"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-gold transition flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-semibold text-muted uppercase">Availability Calendar</span>
            <p className="mt-2 font-serif text-2xl font-bold text-forest">Gantt View</p>
            <span className="mt-1 text-xs text-forest group-hover:text-gold flex items-center gap-1 font-medium">
              Check Dates &rarr;
            </span>
          </div>
          <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
            <CalendarIcon className="h-6 w-6" />
          </div>
        </Link>

        <Link
          href="/admin/housekeeping"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-gold transition flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-semibold text-muted uppercase">Housekeeping</span>
            <p className="mt-2 font-serif text-2xl font-bold text-forest">Room Status</p>
            <span className="mt-1 text-xs text-forest group-hover:text-gold flex items-center gap-1 font-medium">
              Assign Cleaning &rarr;
            </span>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
            <CheckIcon className="h-6 w-6" />
          </div>
        </Link>

        <Link
          href="/admin/payments"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-gold transition flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-semibold text-muted uppercase">Payments &amp; Refunds</span>
            <p className="mt-2 font-serif text-2xl font-bold text-forest">Collections</p>
            <span className="mt-1 text-xs text-forest group-hover:text-gold flex items-center gap-1 font-medium">
              Verify Payments &rarr;
            </span>
          </div>
          <div className="rounded-xl bg-gold/20 p-3 text-forest">
            <CreditCardIcon className="h-6 w-6" />
          </div>
        </Link>
      </div>

      {/* Recent Reservations Table */}
      {dashboardData?.recent_reservations && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-serif text-xl font-medium text-forest">
                Recent Reservation Requests
              </h3>
              <p className="text-xs text-muted">
                Latest bookings recorded in the system.
              </p>
            </div>
            <Link
              href="/admin/reservations"
              className="text-xs font-semibold text-forest hover:text-gold print:hidden"
            >
              View All Reservations &rarr;
            </Link>
          </div>

          {dashboardData.recent_reservations.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              No reservations recorded yet.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs font-semibold text-muted uppercase">
                  <tr>
                    <th className="py-3 px-3">Reference</th>
                    <th className="py-3 px-3">Guest</th>
                    <th className="py-3 px-3">Accommodation</th>
                    <th className="py-3 px-3">Stay Dates</th>
                    <th className="py-3 px-3">Total</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboardData.recent_reservations.map((res: any) => {
                    const statusColors: Record<string, string> = {
                      pending: "bg-amber-100 text-amber-800",
                      confirmed: "bg-emerald-100 text-emerald-800",
                      checked_in: "bg-blue-100 text-blue-800",
                      cancelled: "bg-rose-100 text-rose-800",
                      completed: "bg-slate-100 text-slate-800",
                      no_show: "bg-purple-100 text-purple-800",
                    };

                    return (
                      <tr key={res.booking_reference} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-mono text-xs font-bold text-forest tabular-nums">
                          <Link
                            href={`/admin/reservations/${res.id || res.booking_reference}`}
                            className="hover:text-gold transition"
                          >
                            {res.booking_reference}
                          </Link>
                        </td>
                        <td className="py-3 px-3 font-medium text-ink">
                          {res.guest.full_name}
                        </td>
                        <td className="py-3 px-3 text-muted">
                          {res.room.name}
                        </td>
                        <td className="py-3 px-3 text-xs text-muted tabular-nums">
                          {formatDisplayDate(res.stay.check_in)} &ndash;{" "}
                          {formatDisplayDate(res.stay.check_out)} ({res.stay.nights}n)
                        </td>
                        <td className="py-3 px-3 font-medium text-forest tabular-nums">
                          {formatPhp(res.pricing.total_price_php)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider ${
                              statusColors[res.status] || "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {res.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right print:hidden">
                          <Link
                            href={`/admin/reservations/${res.id || res.booking_reference}`}
                            className="text-xs font-semibold text-forest hover:text-gold transition"
                          >
                            Review &rarr;
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
