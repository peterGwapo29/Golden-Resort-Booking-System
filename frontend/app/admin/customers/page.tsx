"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAdminCustomers, PaginatedResult } from "@/lib/admin-api";
import { formatDate } from "@/lib/utils";
import {
  UserCheckIcon,
  SearchIcon,
  RefreshIcon,
} from "@/components/ui/Icons";
import DataTablesWrapper from "@/components/admin/DataTablesWrapper";

export default function AdminCustomersPage() {
  const pathname = usePathname();
  const portalBase = pathname.startsWith("/staff") ? "/staff" : "/admin";
  const [data, setData] = useState<PaginatedResult<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCustomers = useCallback(
    async (page = 1, searchQuery = "") => {
      try {
        setLoading(true);
        setError(null);
        const res = await getAdminCustomers({
          search: searchQuery.trim() || undefined,
          page,
        });
        setData(res);
      } catch (err: any) {
        setError(err.message || "Failed to load customers.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchCustomers(currentPage, search);
  }, [fetchCustomers, currentPage, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCustomers(1, search);
  };

  const tableColumns = [
    { title: "Guest Name", data: "full_name", name: "name" },
    { title: "Email", data: "email", name: "email" },
    { title: "Phone", data: "phone", name: "phone" },
    { title: "Reservations", data: "total_reservations", name: "reservations" },
    { title: "First Stay", data: "created_at", name: "created" },
    { title: "Actions", data: null, name: "actions", orderable: false },
  ];

  const tableSlots = {
    name: (_cellData: any, rowData: any) => (
      <Link
        href={`${portalBase}/customers/${rowData.id}`}
        className="font-semibold text-forest hover:text-gold transition"
      >
        {rowData.full_name}
      </Link>
    ),
    email: (cellData: any) => (
      <a
        href={`mailto:${cellData}`}
        className="text-xs text-stone-700 hover:text-forest hover:underline"
      >
        {cellData}
      </a>
    ),
    phone: (cellData: any) => (
      <span className="text-xs font-mono text-stone-700">
        {cellData || "—"}
      </span>
    ),
    reservations: (cellData: any) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-forest-50 text-forest border border-forest-100">
        {cellData} {cellData === 1 ? "booking" : "bookings"}
      </span>
    ),
    created: (cellData: any) => (
      <span className="text-xs text-stone-600">
        {formatDate(cellData)}
      </span>
    ),
    actions: (_cellData: any, rowData: any) => (
      <div className="text-right">
        <Link
          href={`${portalBase}/customers/${rowData.id}`}
          className="inline-flex items-center px-3 py-1 bg-ivory-100 text-forest hover:bg-forest hover:text-white rounded-lg text-xs font-semibold transition"
        >
          View Profile →
        </Link>
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-ivory-300">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-forest flex items-center gap-3">
            <UserCheckIcon className="w-7 h-7 text-gold" />
            Guest Directory
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Registered customer records, stay histories, and lifetime resort value.
          </p>
        </div>

        <button
          onClick={() => fetchCustomers(currentPage, search)}
          className="self-start sm:self-auto p-2 text-stone-600 hover:text-forest border border-stone-200 rounded-lg hover:bg-stone-50 transition"
          title="Refresh guest list"
        >
          <RefreshIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-ivory-300 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative max-w-md">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-ivory-50 border border-stone-200 rounded-lg text-xs text-forest focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <SearchIcon className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
          {error}
        </div>
      )}

      {/* Customers DataTable */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden p-4">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs text-forest-700">Loading guest directory...</p>
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="text-center py-16 px-4">
            <UserCheckIcon className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-base font-serif font-bold text-stone-800">No Guests Found</p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              No customer profiles match your search criteria.
            </p>
          </div>
        ) : (
          <DataTablesWrapper
            data={data.data}
            columns={tableColumns}
            slots={tableSlots}
            options={{
              pageLength: 10,
              order: [[0, "asc"]],
            }}
          />
        )}
      </div>
    </div>
  );
}
