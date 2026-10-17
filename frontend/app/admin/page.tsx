"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboardStats, type DashboardMetrics } from "@/lib/admin-api";
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
} from "@/components/ui/Icons";

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getDashboardStats();
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load operational metrics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-forest border-t-gold" />
        <p className="mt-4 text-sm font-medium text-muted">
          Loading resort operations data...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-8 text-center text-red-900">
        <InfoIcon className="mx-auto h-8 w-8 text-red-600" />
        <h2 className="mt-3 text-lg font-bold">Unable to Load Dashboard Data</h2>
        <p className="mt-1 text-sm">{error}</p>
        <button
          type="button"
          onClick={loadStats}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-semibold text-white hover:bg-forest-dark transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
        >
          <RefreshIcon className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const { metrics, recent_reservations } = data;

  return (
    <div className="space-y-8">
      {/* Page Title & Refresh */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-semibold tracking-wider text-gold uppercase">
            Operations Overview
          </span>
          <h2 className="font-serif text-3xl font-medium text-forest sm:text-4xl">
            Resort Dashboard
          </h2>
        </div>
        <button
          type="button"
          onClick={loadStats}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 hover:text-forest transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
        >
          <RefreshIcon className="h-4 w-4" />
          Refresh Stats
        </button>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Bookings */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase">
              Total Bookings
            </span>
            <div className="rounded-lg bg-forest/10 p-2 text-forest">
              <ClipboardListIcon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 font-serif text-3xl font-semibold text-forest">
            {metrics.reservations.total}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            {metrics.reservations.pending} Pending Approval
          </div>
        </div>

        {/* Confirmed Stays */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase">
              Confirmed Stays
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-700">
              <CheckIcon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 font-serif text-3xl font-semibold text-forest">
            {metrics.reservations.confirmed}
          </p>
          <div className="mt-2 text-xs text-muted">
            {metrics.reservations.cancelled} Cancelled Bookings
          </div>
        </div>

        {/* Today's Front Desk Activity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase">
              Today&apos;s Arrivals
            </span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-700">
              <CalendarIcon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 font-serif text-3xl font-semibold text-forest">
            {metrics.today.check_ins}
          </p>
          <div className="mt-2 text-xs text-muted">
            {metrics.today.check_outs} Scheduled Check-Outs Today
          </div>
        </div>

        {/* Net Collections */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase">
              Net Collections
            </span>
            <div className="rounded-lg bg-gold/20 p-2 text-forest">
              <CreditCardIcon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 font-serif text-3xl font-semibold text-forest">
            {formatPhp(metrics.financials.net_collections_php ?? metrics.financials.verified_revenue_php)}
          </p>
          <div className="mt-2 text-xs text-muted truncate">
            {formatPhp(metrics.financials.gross_collections_php ?? metrics.financials.verified_revenue_php)} Gross • -{formatPhp(metrics.financials.completed_refunds_php ?? 0)} Refunds
          </div>
        </div>
      </div>

      {/* Financial Operations Reconciliation (5 Authoritative Server-Driven Metrics) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <span className="text-xs font-semibold tracking-wider text-gold uppercase">
              Financial Reconciliation
            </span>
            <h3 className="font-serif text-xl font-medium text-forest">
              Operational Financial Metrics
            </h3>
          </div>
          <Link
            href="/admin/payments"
            className="text-xs font-semibold text-forest hover:text-gold flex items-center gap-1"
          >
            Manage Verified Payments &rarr;
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Net Collections */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Net Collections
            </span>
            <p className="mt-2 font-serif text-2xl font-bold text-forest tabular-nums">
              {formatPhp(metrics.financials.net_collections_php ?? metrics.financials.verified_revenue_php)}
            </p>
            <p className="mt-1 text-[11px] text-emerald-700">
              Gross Collections less Refunds
            </p>
          </div>

          {/* Gross Collections */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Gross Collections
            </span>
            <p className="mt-2 font-serif text-2xl font-bold text-forest tabular-nums">
              {formatPhp(metrics.financials.gross_collections_php ?? metrics.financials.verified_revenue_php)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Total completed receipts
            </p>
          </div>

          {/* Completed Refunds */}
          <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
            <span className="text-xs font-semibold text-purple-800 uppercase tracking-wider">
              Completed Refunds
            </span>
            <p className="mt-2 font-serif text-2xl font-bold text-purple-900 tabular-nums">
              {formatPhp(metrics.financials.completed_refunds_php ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-purple-700">
              Approved reversals &amp; refunds
            </p>
          </div>

          {/* Pending Payments */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Pending Verification
            </span>
            <p className="mt-2 font-serif text-2xl font-bold text-amber-900 tabular-nums">
              {formatPhp(metrics.financials.pending_payments_php ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-amber-700">
              {metrics.financials.pending_payments_count ?? 0} receipts awaiting review
            </p>
          </div>

          {/* Outstanding Balances */}
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
              Outstanding Balances
            </span>
            <p className="mt-2 font-serif text-2xl font-bold text-rose-900 tabular-nums">
              {formatPhp(metrics.financials.outstanding_balances_php ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-rose-700">
              Active unpaid booking balances
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Metrics & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Management Links */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-serif text-xl font-medium text-forest">
            Management Modules
          </h3>
          <p className="mt-1 text-xs text-muted">
            Direct access to core administrative operational sections.
          </p>

          <div className="mt-5 space-y-3 text-sm">
            <Link
              href="/admin/reservations"
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3.5 font-medium transition-colors hover:border-forest/20 hover:bg-forest/5"
            >
              <div className="flex items-center gap-3">
                <ClipboardListIcon className="h-5 w-5 text-forest" />
                <span>Reservation Management</span>
              </div>
              <ArrowRightIcon className="h-4 w-4 text-muted" />
            </Link>

            <Link
              href="/admin/rooms"
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3.5 font-medium transition-colors hover:border-forest/20 hover:bg-forest/5"
            >
              <div className="flex items-center gap-3">
                <DoorIcon className="h-5 w-5 text-forest" />
                <span>Accommodations &amp; Rates</span>
              </div>
              <ArrowRightIcon className="h-4 w-4 text-muted" />
            </Link>

            <Link
              href="/admin/payments"
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3.5 font-medium transition-colors hover:border-forest/20 hover:bg-forest/5"
            >
              <div className="flex items-center gap-3">
                <CreditCardIcon className="h-5 w-5 text-forest" />
                <span>Verified Payments Log</span>
              </div>
              <ArrowRightIcon className="h-4 w-4 text-muted" />
            </Link>
          </div>
        </div>

        {/* Accommodation Status Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-serif text-xl font-medium text-forest">
                Accommodation Inventory Status
              </h3>
              <p className="text-xs text-muted">
                {metrics.rooms.active} of {metrics.rooms.total} room categories active ({metrics.rooms.total_units} total physical bookable units).
              </p>
            </div>
            <Link
              href="/admin/rooms"
              className="text-xs font-semibold text-forest hover:text-gold"
            >
              Manage &rarr;
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <span className="text-xs text-muted">Total Room Types</span>
              <p className="mt-1 font-serif text-2xl font-bold text-forest">
                {metrics.rooms.total}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <span className="text-xs text-muted">Active In Catalog</span>
              <p className="mt-1 font-serif text-2xl font-bold text-emerald-700">
                {metrics.rooms.active}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <span className="text-xs text-muted">Physical Capacity Units</span>
              <p className="mt-1 font-serif text-2xl font-bold text-forest">
                {metrics.rooms.total_units}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reservations Table */}
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
            className="text-xs font-semibold text-forest hover:text-gold"
          >
            View All Reservations &rarr;
          </Link>
        </div>

        {recent_reservations.length === 0 ? (
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
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent_reservations.map((res: any) => {
                  const statusColors: Record<string, string> = {
                    pending: "bg-amber-100 text-amber-800",
                    confirmed: "bg-emerald-100 text-emerald-800",
                    cancelled: "bg-rose-100 text-rose-800",
                    completed: "bg-slate-100 text-slate-800",
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
                          {res.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
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
    </div>
  );
}
