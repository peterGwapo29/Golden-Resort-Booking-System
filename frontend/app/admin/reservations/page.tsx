"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getAdminReservations,
  updateAdminReservationStatus,
  type PaginatedResult,
} from "@/lib/admin-api";
import { formatPhp, formatDisplayDate } from "@/lib/booking-utils";
import {
  SearchIcon,
  FilterIcon,
  CloseIcon,
  InfoIcon,
  PlusIcon,
} from "@/components/ui/Icons";
import DataTablesWrapper from "@/components/admin/DataTablesWrapper";
import CreateReservationModal from "@/components/admin/CreateReservationModal";

export default function AdminReservationsPage() {
  const pathname = usePathname();
  const portalBase = pathname.startsWith("/staff") ? "/staff" : "/admin";
  const [data, setData] = useState<PaginatedResult<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  // Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Status Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<string>("confirmed");
  const [staffNotes, setStaffNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchReservations = async () => {
    setIsLoading(true);
    try {
      const res = await getAdminReservations({
        search,
        status,
        from_date: fromDate,
        to_date: toDate,
        page,
      });
      setData(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [status, fromDate, toDate, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReservations();
  };

  const handleOpenStatusModal = (res: any) => {
    setSelectedRes(res);
    setNewStatus(res.status === "pending" ? "confirmed" : res.status);
    setStaffNotes("");
    setModalError(null);
    setModalOpen(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRes) return;
    setIsSubmitting(true);
    setModalError(null);

    try {
      await updateAdminReservationStatus(
        selectedRes.id || selectedRes.room.id,
        newStatus,
        staffNotes
      );
      setActionSuccess(
        `Reservation ${selectedRes.booking_reference} updated to ${newStatus.toUpperCase()}.`
      );
      setModalOpen(false);
      fetchReservations();
    } catch (err: any) {
      setModalError(err.message || "Failed to update reservation status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusPills: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-rose-100 text-rose-800",
    completed: "bg-slate-100 text-slate-800",
  };

  const paymentPills: Record<string, string> = {
    unpaid: "bg-red-50 text-red-700 border border-red-200",
    partial: "bg-amber-50 text-amber-700 border border-amber-200",
    paid: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  };

  const tableColumns = [
    { title: "Booking Ref", data: "booking_reference", name: "ref" },
    { title: "Primary Guest", data: "guest.full_name", name: "guest" },
    { title: "Accommodation", data: "room.name", name: "accommodation" },
    { title: "Stay Schedule", data: "stay.check_in", name: "schedule" },
    { title: "Total Amount", data: "pricing.total_price_php", name: "amount" },
    { title: "Payment", data: "payment_status", name: "payment" },
    { title: "Status", data: "status", name: "status" },
    { title: "Actions", data: null, name: "actions", orderable: false },
  ];

  const tableSlots = {
    ref: (_cellData: any, rowData: any) => (
      <div>
        <Link
          href={`${portalBase}/reservations/${rowData.id || rowData.booking_reference}`}
          className="font-mono text-xs font-bold text-forest hover:text-gold"
        >
          {rowData.booking_reference}
        </Link>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="block text-[0.7rem] text-muted">
            {new Date(rowData.created_at).toLocaleDateString()}
          </span>
          {rowData.booking_source && rowData.booking_source !== "website" && (
            <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-forest">
              {rowData.booking_source.replace("_", " ")}
            </span>
          )}
        </div>
      </div>
    ),
    guest: (_cellData: any, rowData: any) => (
      <div>
        <p className="font-medium text-ink">{rowData.guest?.full_name}</p>
        <p className="text-xs text-muted truncate max-w-[180px]">
          {rowData.guest?.email}
        </p>
      </div>
    ),
    accommodation: (_cellData: any, rowData: any) => (
      <span className="font-serif text-sm font-medium text-forest">
        {rowData.room?.name}
      </span>
    ),
    schedule: (_cellData: any, rowData: any) => {
      const checkIn = rowData.stay?.check_in ?? rowData.check_in;
      const checkOut = rowData.stay?.check_out ?? rowData.check_out;
      const nights = rowData.stay?.nights ?? rowData.nights ?? 1;
      const guests = rowData.stay?.total_guests ?? rowData.total_guests ?? (rowData.adults ?? 1);
      return (
        <div className="text-xs text-muted tabular-nums">
          <p className="font-medium text-ink">
            {formatDisplayDate(checkIn)} &ndash; {formatDisplayDate(checkOut)}
          </p>
          <p className="text-[0.7rem] text-muted">
            {nights} night{nights > 1 ? "s" : ""} &bull; {guests} guest{guests > 1 ? "s" : ""}
          </p>
        </div>
      );
    },
    amount: (cellData: any, rowData: any) => (
      <span className="font-semibold text-forest tabular-nums">
        {formatPhp(cellData ?? rowData.total_price_php ?? 0)}
      </span>
    ),
    payment: (cellData: any) => (
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${
          paymentPills[cellData] || "bg-slate-100 text-slate-800"
        }`}
      >
        {cellData || "unpaid"}
      </span>
    ),
    status: (cellData: any) => (
      <span
        className={`inline-block rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider ${
          statusPills[cellData] || "bg-slate-100 text-slate-800"
        }`}
      >
        {cellData}
      </span>
    ),
    actions: (_cellData: any, rowData: any) => (
      <div className="flex items-center justify-end gap-3 text-xs">
        <button
          type="button"
          onClick={() => handleOpenStatusModal(rowData)}
          className="font-semibold text-forest hover:text-gold transition cursor-pointer"
        >
          Change Status
        </button>
        <Link
          href={`${portalBase}/reservations/${rowData.id || rowData.booking_reference}`}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-slate-600 hover:bg-slate-50 transition"
        >
          Details
        </Link>
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold tracking-wider text-gold uppercase">
            Bookings Management
          </span>
          <h2 className="font-serif text-3xl font-medium text-forest sm:text-4xl">
            Reservations Directory
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-forest-dark transition cursor-pointer self-start sm:self-auto"
        >
          <PlusIcon className="h-4 w-4 text-gold" />
          <span> New Walk-In / Reservation</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-medium text-emerald-900">
          <span>{actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, guest name, email..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-ink focus:border-gold focus:bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-forest-dark transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <FilterIcon className="h-3.5 w-3.5 text-forest" />
            <span>Status:</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-ink focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Approval</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span>From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-ink focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span>To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-ink focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Reservations DataTable */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden p-4">
        {isLoading && !data ? (
          <div className="py-20 text-center text-sm text-muted">
            <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading reservations...
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">
            No reservations found.
          </div>
        ) : (
          <DataTablesWrapper
            data={data.data}
            columns={tableColumns}
            slots={tableSlots}
            options={{
              pageLength: 10,
              order: [[0, "desc"]],
            }}
          />
        )}
      </div>

      {/* Status Transition Modal */}
      {modalOpen && selectedRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-xs text-muted">
                  {selectedRes.booking_reference}
                </span>
                <h3 className="font-serif text-xl font-medium text-forest">
                  Update Booking Status
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted hover:text-ink"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-900">
                <InfoIcon className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <p>{modalError}</p>
              </div>
            )}

            <form onSubmit={handleStatusSubmit} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-forest uppercase">
                  Select New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                >
                  <option value="pending">Pending Approval</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled (Releases Inventory)</option>
                  <option value="completed">Completed Stay</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-forest uppercase">
                  Staff Audit Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  placeholder="e.g. Confirmed after 50% deposit received via bank transfer."
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-forest px-5 py-2 text-xs font-semibold text-white hover:bg-forest-dark disabled:opacity-50 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  {isSubmitting ? "Applying..." : "Confirm Status Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Walk-In & Phone Reservation Creation Modal */}
      <CreateReservationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchReservations();
          setActionSuccess("Reservation created successfully.");
        }}
      />
    </div>
  );
}
