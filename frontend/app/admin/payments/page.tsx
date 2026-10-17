"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getAdminPayments,
  recordAdminPayment,
  updateAdminPaymentStatus,
  createAdminRefund,
  PaginatedResult,
} from "@/lib/admin-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CreditCardIcon,
  SearchIcon,
  FilterIcon,
  PlusIcon,
  RefreshIcon,
} from "@/components/ui/Icons";
import DataTablesWrapper from "@/components/admin/DataTablesWrapper";

export default function AdminPaymentsPage() {
  const [data, setData] = useState<PaginatedResult<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Record Payment Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [reservationIdInput, setReservationIdInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [methodInput, setMethodInput] = useState("credit_card");
  const [notesInput, setNotesInput] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Status Update Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<string>("completed");
  const [statusNotes, setStatusNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusModalError, setStatusModalError] = useState<string | null>(null);

  // Refund Modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundPayment, setRefundPayment] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [refundModalError, setRefundModalError] = useState<string | null>(null);

  const fetchPayments = useCallback(
    async (page = 1, searchQuery = "", statusFilter = "all", methodFilter = "all") => {
      try {
        setLoading(true);
        setError(null);
        const res = await getAdminPayments({
          search: searchQuery.trim() || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          payment_method: methodFilter !== "all" ? methodFilter : undefined,
          page,
        });
        setData(res);
      } catch (err: any) {
        setError(err.message || "Failed to load payment transactions.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPayments(currentPage, search, status, method);
  }, [fetchPayments, currentPage, search, status, method]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPayments(1, search, status, method);
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingPayment(true);
      setModalError(null);

      const parsedReservationId = parseInt(reservationIdInput, 10);
      const parsedAmount = parseFloat(amountInput);

      if (isNaN(parsedReservationId) || parsedReservationId <= 0) {
        setModalError("Please provide a valid numeric Reservation ID.");
        setSubmittingPayment(false);
        return;
      }

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setModalError("Please provide a valid payment amount greater than zero.");
        setSubmittingPayment(false);
        return;
      }

      await recordAdminPayment({
        reservation_id: parsedReservationId,
        amount: parsedAmount,
        payment_method: methodInput,
        notes: notesInput,
      });

      setModalOpen(false);
      setReservationIdInput("");
      setAmountInput("");
      setNotesInput("");
      await fetchPayments(1, search, status, method);
    } catch (err: any) {
      setModalError(err.message || "Failed to record payment transaction.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    try {
      setUpdatingStatus(true);
      setStatusModalError(null);

      await updateAdminPaymentStatus(
        selectedPayment.id,
        newStatus as "pending" | "completed" | "failed" | "cancelled",
        statusNotes
      );

      setStatusModalOpen(false);
      setSelectedPayment(null);
      await fetchPayments(currentPage, search, status, method);
    } catch (err: any) {
      setStatusModalError(err.message || "Failed to update payment status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCreateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundPayment) return;

    try {
      setSubmittingRefund(true);
      setRefundModalError(null);

      const parsedAmount = parseFloat(refundAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setRefundModalError("Please enter a valid refund amount greater than zero.");
        setSubmittingRefund(false);
        return;
      }

      const remainingAllowed = refundPayment.remaining_refundable ?? refundPayment.amount;
      if (parsedAmount > remainingAllowed + 0.001) {
        setRefundModalError(
          `Refund amount cannot exceed remaining refundable balance of ${formatCurrency(remainingAllowed)}.`
        );
        setSubmittingRefund(false);
        return;
      }

      if (!refundReason.trim()) {
        setRefundModalError("Please provide a reason for the refund.");
        setSubmittingRefund(false);
        return;
      }

      await createAdminRefund(refundPayment.id, {
        amount: parsedAmount,
        reason: refundReason.trim(),
        notes: refundNotes.trim() || undefined,
        status: "completed",
      });

      setRefundModalOpen(false);
      setRefundPayment(null);
      setRefundAmount("");
      setRefundReason("");
      setRefundNotes("");
      await fetchPayments(currentPage, search, status, method);
    } catch (err: any) {
      setRefundModalError(err.message || "Failed to process refund.");
    } finally {
      setSubmittingRefund(false);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "refunded":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "failed":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-stone-100 text-stone-700 border-stone-200";
    }
  };

  const tableColumns = [
    { title: "Receipt Ref", data: "payment_reference", name: "receipt" },
    { title: "Booking Ref", data: "booking_reference", name: "booking" },
    { title: "Guest", data: "guest_name", name: "guest" },
    { title: "Method", data: "payment_method", name: "method" },
    { title: "Amount", data: "amount", name: "amount" },
    { title: "Status", data: "status", name: "status" },
    { title: "Staff", data: "recorded_by", name: "staff" },
    { title: "Date", data: "created_at", name: "date" },
    { title: "Action", data: "id", name: "action", orderable: false },
  ];

  const tableSlots = {
    receipt: (cellData: any) => (
      <span className="font-mono text-xs font-bold text-forest-900">
        {cellData}
      </span>
    ),
    booking: (_cellData: any, rowData: any) => {
      const resId = rowData.reservation_id;
      const ref = rowData.booking_reference || (resId ? `Res #${resId}` : "—");
      return resId ? (
        <Link
          href={`/admin/reservations/${resId}`}
          className="text-forest hover:text-gold hover:underline font-mono text-xs font-bold tabular-nums"
        >
          {ref}
        </Link>
      ) : (
        <span className="font-mono text-xs text-stone-500 tabular-nums">—</span>
      );
    },
    guest: (cellData: any) => (
      <span className="text-xs font-medium text-stone-900">
        {cellData || "—"}
      </span>
    ),
    method: (cellData: any) => (
      <span className="text-xs capitalize text-stone-700">
        {cellData?.replace(/_/g, " ") || "—"}
      </span>
    ),
    amount: (cellData: any, rowData: any) => {
      const refunded = Number(rowData.refunded_amount || 0);
      return (
        <div>
          <span className="font-serif font-bold text-emerald-800 tabular-nums">
            {formatCurrency(cellData)}
          </span>
          {refunded > 0 && (
            <p className="text-[10px] font-semibold text-purple-700 tabular-nums mt-0.5">
              Refunded: {formatCurrency(refunded)}
            </p>
          )}
        </div>
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
    staff: (cellData: any) => (
      <span className="text-xs text-stone-600">
        {cellData || "Staff"}
      </span>
    ),
    date: (cellData: any) => (
      <span className="text-xs text-stone-500">
        {formatDate(cellData)}
      </span>
    ),
    action: (_cellData: any, rowData: any) => {
      const isCompleted = rowData.status === "completed";
      const remainingRefundable = Number(rowData.remaining_refundable ?? rowData.amount);

      return (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            type="button"
            onClick={() => {
              setSelectedPayment(rowData);
              setNewStatus(rowData.status);
              setStatusNotes(rowData.notes || "");
              setStatusModalError(null);
              setStatusModalOpen(true);
            }}
            className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-md border border-stone-200 bg-white text-forest hover:bg-forest hover:text-white transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          >
            Update
          </button>
          {isCompleted && remainingRefundable > 0 && (
            <button
              type="button"
              onClick={() => {
                setRefundPayment(rowData);
                setRefundAmount(remainingRefundable.toFixed(2));
                setRefundReason("");
                setRefundNotes("");
                setRefundModalError(null);
                setRefundModalOpen(true);
              }}
              className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-md border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-600 hover:text-white transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              Refund
            </button>
          )}
        </div>
      );
    },
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-ivory-300">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-forest flex items-center gap-3">
            <CreditCardIcon className="w-7 h-7 text-gold" />
            Payment Records
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Manual and staff-verified payment receipts, refund tracking, audit trail, and net collections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPayments(currentPage, search, status, method)}
            className="p-2 text-stone-600 hover:text-forest border border-stone-200 rounded-lg hover:bg-stone-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
            title="Refresh transactions"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {
              setModalError(null);
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-dark transition flex items-center gap-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
          >
            <PlusIcon className="w-3.5 h-3.5 text-gold" />
            Record Payment
          </button>
        </div>
      </div>

      {/* Revenue KPI Summary Card */}
      {data?.summary && (
        <div className="bg-white p-6 rounded-2xl border border-ivory-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold text-gold uppercase tracking-wider">
              Net Verified Collections
            </p>
            <p className="text-3xl sm:text-4xl font-serif font-bold text-forest mt-1 tabular-nums">
              {formatCurrency(data.summary.net_collections_php ?? data.summary.total_completed_php ?? 0)}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Net revenue after deducting completed refunds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="bg-ivory-50 border border-ivory-200 px-3.5 py-2 rounded-xl">
              <span className="text-stone-500 block text-[10px] uppercase font-bold">Gross Collections</span>
              <span className="font-serif font-bold text-forest tabular-nums text-sm">
                {formatCurrency(data.summary.gross_collections_php ?? data.summary.total_completed_php ?? 0)}
              </span>
            </div>
            <div className="bg-purple-50/70 border border-purple-200 px-3.5 py-2 rounded-xl">
              <span className="text-purple-700 block text-[10px] uppercase font-bold">Completed Refunds</span>
              <span className="font-serif font-bold text-purple-900 tabular-nums text-sm">
                {formatCurrency(data.summary.completed_refunds_php ?? 0)}
              </span>
            </div>
            {Number(data.summary.pending_payments_php ?? 0) > 0 && (
              <div className="bg-amber-50/70 border border-amber-200 px-3.5 py-2 rounded-xl">
                <span className="text-amber-700 block text-[10px] uppercase font-bold">Pending Clearance</span>
                <span className="font-serif font-bold text-amber-900 tabular-nums text-sm">
                  {formatCurrency(data.summary.pending_payments_php ?? 0)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-ivory-300 shadow-sm flex flex-col md:flex-row items-center gap-4">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search by receipt ref, booking ref, or guest name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-ivory-50 border border-stone-200 rounded-lg text-xs text-forest focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <SearchIcon className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
        </form>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <FilterIcon className="w-4 h-4 text-stone-400" />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-ivory-50 border border-stone-200 rounded-lg text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-gold w-full md:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-ivory-50 border border-stone-200 rounded-lg text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-gold w-full md:w-auto"
          >
            <option value="all">All Methods</option>
            <option value="credit_card">Credit Card (POS)</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="e_wallet">GCash / Maya</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
          {error}
        </div>
      )}

      {/* Transactions DataTable */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm overflow-hidden p-4">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs text-forest">Loading transactions...</p>
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="text-center py-16 px-4">
            <CreditCardIcon className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-base font-serif font-bold text-stone-800">No Transactions Found</p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              No payment records match your selected criteria.
            </p>
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

      {/* RECORD PAYMENT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-ivory-300">
            <h3 className="text-xl font-serif font-bold text-forest mb-2">
              Record Manual Payment
            </h3>
            <p className="text-xs text-stone-500 mb-6">
              Create a payment record attached to a customer reservation. New payments are automatically logged as <span className="font-semibold text-amber-700">Pending</span> until verified.
            </p>

            {modalError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg mb-4 border border-red-200">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Reservation System ID *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 1"
                  value={reservationIdInput}
                  onChange={(e) => setReservationIdInput(e.target.value)}
                  className="w-full px-3 py-2 bg-ivory-50 border border-stone-300 rounded-lg text-sm text-forest focus:outline-none focus:ring-2 focus:ring-gold font-mono"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Find the numeric ID from the Reservations table or booking detail page.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Amount (PHP) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 5000.00"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full px-3 py-2 bg-ivory-50 border border-stone-300 rounded-lg text-sm text-forest font-serif font-bold focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Payment Method *
                </label>
                <select
                  value={methodInput}
                  onChange={(e) => setMethodInput(e.target.value)}
                  className="w-full px-3 py-2 bg-ivory-50 border border-stone-300 rounded-lg text-xs text-forest focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="credit_card">Credit Card (POS)</option>
                  <option value="cash">Cash on Arrival</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="e_wallet">GCash / Maya</option>
                  <option value="other">Other Payment Method</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Transaction Notes / Reference
                </label>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="e.g., Bank slip ref #BDO-99218 confirmed with accounting..."
                  rows={2}
                  className="w-full px-3 py-2 bg-ivory-50 border border-stone-300 rounded-lg text-xs text-forest focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-ivory-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submittingPayment}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 hover:text-stone-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 bg-forest text-white rounded-lg text-xs font-bold hover:bg-forest-dark disabled:opacity-50 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  {submittingPayment ? "Recording..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {statusModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-ivory-300">
            <h3 className="text-xl font-serif font-bold text-forest mb-1">
              Update Payment Status
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Update status for receipt <span className="font-mono font-bold text-forest">{selectedPayment.payment_reference}</span>.
            </p>

            {statusModalError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg mb-4 border border-red-200">
                {statusModalError}
              </div>
            )}

            <div className="bg-ivory-50 p-3.5 rounded-xl border border-ivory-200 mb-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-500">Booking:</span>
                <span className="font-mono font-bold text-forest">
                  {selectedPayment.booking_reference || (selectedPayment.reservation_id ? `Res #${selectedPayment.reservation_id}` : "—")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Guest:</span>
                <span className="font-medium text-stone-800">{selectedPayment.guest_name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Amount:</span>
                <span className="font-serif font-bold text-emerald-800 tabular-nums">
                  {formatCurrency(selectedPayment.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-stone-500">Current Status:</span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadge(
                    selectedPayment.status
                  )}`}
                >
                  {selectedPayment.status}
                </span>
              </div>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Target Status *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-ivory-50 border border-stone-300 rounded-lg text-xs text-forest focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="completed">Completed (Verified & Accepted)</option>
                  <option value="pending">Pending (Awaiting Verification)</option>
                  <option value="cancelled">Cancelled (Voided Attempt)</option>
                  <option value="failed">Failed / Declined (Rejected)</option>
                </select>
                <p className="text-[11px] text-stone-500 mt-1">
                  Note: To return funds, please use the separate <span className="font-semibold text-purple-700">Issue Refund</span> action.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Staff Audit Note (Optional)
                </label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="e.g., Funds verified in bank account / cash received at reception..."
                  rows={2}
                  className="w-full px-3 py-2 bg-ivory-50 border border-stone-300 rounded-lg text-xs text-forest focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-ivory-200">
                <button
                  type="button"
                  onClick={() => {
                    setStatusModalOpen(false);
                    setSelectedPayment(null);
                  }}
                  disabled={updatingStatus}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 hover:text-stone-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-5 py-2 bg-forest text-white rounded-lg text-xs font-bold hover:bg-forest-dark disabled:opacity-50 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  {updatingStatus ? "Updating..." : "Save Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ISSUE REFUND MODAL */}
      {refundModalOpen && refundPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-ivory-300">
            <h3 className="text-xl font-serif font-bold text-forest mb-1">
              Issue Payment Refund
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Return full or partial funds for receipt <span className="font-mono font-bold text-forest">{refundPayment.payment_reference}</span>.
            </p>

            {refundModalError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg mb-4 border border-red-200">
                {refundModalError}
              </div>
            )}

            <div className="bg-ivory-50 p-3.5 rounded-xl border border-ivory-200 mb-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-500">Booking:</span>
                <span className="font-mono font-bold text-forest">
                  {refundPayment.booking_reference || (refundPayment.reservation_id ? `Res #${refundPayment.reservation_id}` : "—")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Guest:</span>
                <span className="font-medium text-stone-800">{refundPayment.guest_name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Original Amount:</span>
                <span className="font-serif font-bold text-stone-800 tabular-nums">
                  {formatCurrency(refundPayment.amount)}
                </span>
              </div>
              {Number(refundPayment.refunded_amount || 0) > 0 && (
                <div className="flex justify-between text-purple-700">
                  <span>Already Refunded:</span>
                  <span className="font-serif font-bold tabular-nums">
                    {formatCurrency(refundPayment.refunded_amount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-ivory-200">
                <span className="text-stone-700 font-semibold">Remaining Refundable:</span>
                <span className="font-serif font-bold text-emerald-800 tabular-nums">
                  {formatCurrency(refundPayment.remaining_refundable ?? refundPayment.amount)}
                </span>
              </div>
            </div>

            <form onSubmit={handleCreateRefund} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Refund Amount (PHP) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={refundPayment.remaining_refundable ?? refundPayment.amount}
                  required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-ivory-50 border border-stone-300 rounded-lg text-sm text-forest font-serif font-bold focus:outline-none focus:ring-2 focus:ring-gold tabular-nums"
                />
                <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                  <span>Available balance: {formatCurrency(refundPayment.remaining_refundable ?? refundPayment.amount)}</span>
                  <button
                    type="button"
                    onClick={() => setRefundAmount(String(refundPayment.remaining_refundable ?? refundPayment.amount))}
                    className="text-forest hover:text-gold font-semibold underline"
                  >
                    Max Amount
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Reason for Refund *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Guest requested cancellation / duplicate charge..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 bg-ivory-50 border border-stone-300 rounded-lg text-xs text-forest focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Staff Audit Note (Optional)
                </label>
                <textarea
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="e.g., Confirmed bank account reversal with finance supervisor..."
                  rows={2}
                  className="w-full px-3 py-2 bg-ivory-50 border border-stone-300 rounded-lg text-xs text-forest focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-ivory-200">
                <button
                  type="button"
                  onClick={() => {
                    setRefundModalOpen(false);
                    setRefundPayment(null);
                  }}
                  disabled={submittingRefund}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 hover:text-stone-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRefund}
                  className="px-5 py-2 bg-purple-700 text-white rounded-lg text-xs font-bold hover:bg-purple-800 disabled:opacity-50 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
                >
                  {submittingRefund ? "Processing..." : "Confirm & Process Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
