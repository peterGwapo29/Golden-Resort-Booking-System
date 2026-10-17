"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { getAdminCustomer } from "@/lib/admin-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  DoorIcon,
  ClipboardListIcon,
} from "@/components/ui/Icons";
import DataTablesWrapper from "@/components/admin/DataTablesWrapper";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminCustomerDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const customerId = parseInt(resolvedParams.id, 10);

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCustomer() {
      try {
        setLoading(true);
        setError(null);
        const res = await getAdminCustomer(customerId);
        setCustomer(res.data);
      } catch (err: any) {
        setError(err.message || "Failed to load customer profile.");
      } finally {
        setLoading(false);
      }
    }
    if (!isNaN(customerId)) {
      loadCustomer();
    }
  }, [customerId]);

  if (loading && !customer) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-forest-700 font-sans">Loading guest profile...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-8 text-center max-w-xl mx-auto my-12">
        <h3 className="text-lg font-serif font-bold text-red-900 mb-2">Guest Not Found</h3>
        <p className="text-sm mb-6">{error || "Unable to locate this customer profile."}</p>
        <Link
          href="/admin/customers"
          className="inline-flex items-center px-4 py-2 bg-forest text-white rounded-lg hover:bg-forest-dark transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
        >
          ← Back to Guest Directory
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-stone-100 text-stone-700 border-stone-200";
    }
  };

  const resColumns = [
    { title: "Booking Ref", data: "booking_reference", name: "ref" },
    { title: "Room", data: "room.name", name: "room" },
    { title: "Stay Dates", data: "stay.check_in", name: "dates" },
    { title: "Nights", data: "stay.nights", name: "nights" },
    { title: "Total Price", data: "pricing.total_price_php", name: "price" },
    { title: "Status", data: "status", name: "status" },
    { title: "Action", data: null, name: "action", orderable: false },
  ];

  const resSlots = {
    ref: (_cellData: any, rowData: any) => {
      const resTarget = rowData.id ?? rowData.booking_reference;
      return (
        <Link
          href={`/admin/reservations/${resTarget}`}
          className="font-mono text-xs font-bold text-forest hover:underline hover:text-gold"
        >
          {rowData.booking_reference}
        </Link>
      );
    },
    room: (_cellData: any, rowData: any) => (
      <span className="text-xs font-medium text-stone-900">
        {rowData.room?.name || rowData.room_name_snapshot || "Accommodation"}
      </span>
    ),
    dates: (_cellData: any, rowData: any) => {
      const checkIn = rowData.stay?.check_in ?? rowData.check_in;
      const checkOut = rowData.stay?.check_out ?? rowData.check_out;
      return (
        <span className="text-xs text-stone-600 tabular-nums">
          {formatDate(checkIn)} → {formatDate(checkOut)}
        </span>
      );
    },
    nights: (_cellData: any, rowData: any) => {
      const nights = rowData.stay?.nights ?? rowData.nights ?? 1;
      return (
        <span className="text-xs text-stone-600 tabular-nums">
          {nights} {nights === 1 ? "night" : "nights"}
        </span>
      );
    },
    price: (_cellData: any, rowData: any) => {
      const price = rowData.pricing?.total_price_php ?? rowData.total_price_php ?? 0;
      return (
        <span className="font-serif font-bold text-forest tabular-nums">
          {formatCurrency(price)}
        </span>
      );
    },
    status: (cellData: any) => (
      <span
        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadge(
          cellData
        )}`}
      >
        {cellData}
      </span>
    ),
    action: (_cellData: any, rowData: any) => {
      const resTarget = rowData.id ?? rowData.booking_reference;
      return (
        <div className="text-right">
          <Link
            href={`/admin/reservations/${resTarget}`}
            className="inline-flex items-center px-3 py-1 bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 hover:text-stone-900 rounded-lg text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest shadow-xs"
          >
            View Booking →
          </Link>
        </div>
      );
    },
  };

  return (
    <div className="space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-3 pb-2 border-b border-ivory-300">
        <Link
          href="/admin/customers"
          className="text-stone-600 hover:text-forest transition text-sm flex items-center gap-1 font-medium"
        >
          ← Back to Guest Directory
        </Link>
        <span className="text-stone-300">/</span>
        <span className="text-xs text-stone-600 font-medium">Guest #{customer.id}</span>
      </div>

      {/* Guest Profile Card */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-forest text-gold flex items-center justify-center font-serif text-2xl font-bold shrink-0 shadow-inner">
              {customer.full_name?.charAt(0)?.toUpperCase() || "G"}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-forest">
                {customer.full_name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 mt-2">
                <span>
                  Email:{" "}
                  <a
                    href={`mailto:${customer.email}`}
                    className="text-forest hover:underline font-medium"
                  >
                    {customer.email}
                  </a>
                </span>
                <span>•</span>
                <span>
                  Phone:{" "}
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-stone-800 hover:underline font-medium"
                  >
                    {customer.phone || "Not provided"}
                  </a>
                </span>
                <span>•</span>
                <span>Customer since {formatDate(customer.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Quick Lifetime Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-ivory-50 p-4 rounded-xl border border-ivory-200 divide-y sm:divide-y-0 sm:divide-x divide-ivory-200">
            <div className="text-center px-2 py-1 sm:py-0">
              <p className="text-[10px] text-stone-600 uppercase tracking-wider font-semibold">
                Reservations
              </p>
              <p className="text-xl font-bold font-serif text-forest mt-0.5 tabular-nums">
                {customer.stats?.total_reservations || 0}
              </p>
            </div>
            <div className="text-center px-2 py-1 sm:py-0">
              <p className="text-[10px] text-stone-600 uppercase tracking-wider font-semibold">
                Nights Stayed
              </p>
              <p className="text-xl font-bold font-serif text-forest mt-0.5 tabular-nums">
                {customer.stats?.total_nights || 0}
              </p>
            </div>
            <div className="text-center px-2 py-1 sm:py-0">
              <p className="text-[10px] text-stone-600 uppercase tracking-wider font-semibold">
                Lifetime Spend
              </p>
              <p className="text-xl font-bold font-serif text-emerald-800 mt-0.5 tabular-nums">
                {formatCurrency(customer.stats?.total_spent_php || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reservation History */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-serif font-bold text-forest flex items-center gap-2">
              <ClipboardListIcon className="w-5 h-5 text-gold" />
              Reservation History
            </h2>
            <p className="text-xs text-stone-600 mt-1">
              All active, pending, and past bookings made under this customer profile.
            </p>
          </div>
        </div>

        {(!customer.reservations || customer.reservations.length === 0) ? (
          <div className="text-center py-12 bg-ivory-50 rounded-xl border border-ivory-200">
            <DoorIcon className="w-8 h-8 text-stone-400 mx-auto mb-2" />
            <p className="text-sm font-serif font-bold text-stone-700">No Reservations Yet</p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
              This guest has not completed any resort reservations.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto p-1">
            <DataTablesWrapper
              data={customer.reservations}
              columns={resColumns}
              slots={resSlots}
              options={{
                pageLength: 5,
                order: [[0, "desc"]],
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
