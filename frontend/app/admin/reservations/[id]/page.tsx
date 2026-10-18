"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getAdminReservation,
  updateAdminReservationStatus,
  recordAdminPayment,
  updateAdminPaymentStatus,
  createAdminRefund,
  getReservationNotifications,
  sendReservationNotification,
  type BookingNotificationItem,
} from "@/lib/admin-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  DoorIcon,
  UserCheckIcon,
  CreditCardIcon,
  PlusIcon,
  BellIcon,
  MailIcon,
  CheckIcon,
  CloseIcon,
} from "@/components/ui/Icons";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminReservationDetailPage({ params }: PageProps) {
  const pathname = usePathname();
  const portalBase = pathname.startsWith("/staff") ? "/staff" : "/admin";
  const resolvedParams = use(params);
  const reservationId = parseInt(resolvedParams.id, 10);

  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("confirmed");
  const [statusNote, setStatusNote] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Payment modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState("credit_card");
  const [payNotes, setPayNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Payment Status Update Modal
  const [paymentStatusModalOpen, setPaymentStatusModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [newPaymentStatus, setNewPaymentStatus] = useState<string>("completed");
  const [paymentStatusNote, setPaymentStatusNote] = useState("");
  const [submittingPaymentStatus, setSubmittingPaymentStatus] = useState(false);
  const [paymentStatusError, setPaymentStatusError] = useState<string | null>(null);

  // Refund modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundPayment, setRefundPayment] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundReason, setRefundReason] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [refundModalError, setRefundModalError] = useState<string | null>(null);

  // Communications & Notifications State
  const [notifications, setNotifications] = useState<BookingNotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [sendingNotifType, setSendingNotifType] = useState<string | null>(null);
  const [notifSuccessMsg, setNotifSuccessMsg] = useState<string | null>(null);
  const [notifErrorMsg, setNotifErrorMsg] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await getReservationNotifications(reservationId);
      setNotifications(res.data);
    } catch (err: any) {
      console.error("Could not fetch notifications:", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleSendNotification = async (
    type: "booking_confirmation" | "payment_reminder" | "checkin_reminder"
  ) => {
    setSendingNotifType(type);
    setNotifSuccessMsg(null);
    setNotifErrorMsg(null);
    try {
      const res = await sendReservationNotification(reservationId, type);
      setNotifSuccessMsg(res.message);
      await fetchNotifications();
    } catch (err: any) {
      setNotifErrorMsg(err.message || "Failed to dispatch notification.");
    } finally {
      setSendingNotifType(null);
    }
  };

  const fetchReservation = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminReservation(reservationId);
      const resData = res.data;
      setReservation(resData);
      setNewStatus(resData.status);

      // Pre-fill remaining balance in payment modal
      const total = Number(resData.pricing?.total_price_php ?? resData.total_price_php ?? 0);
      const paid = Number(resData.net_paid_php ?? resData.total_paid_php ?? 0);
      const remaining = Number(resData.remaining_balance_php ?? Math.max(0, total - paid));
      setPayAmount(remaining > 0 ? remaining.toFixed(2) : "0.00");
    } catch (err: any) {
      setError(err.message || "Failed to load reservation details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isNaN(reservationId)) {
      fetchReservation();
      fetchNotifications();
    }
  }, [reservationId]);

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingStatus(true);
      setStatusError(null);
      await updateAdminReservationStatus(reservationId, newStatus, statusNote);
      setStatusModalOpen(false);
      setStatusNote("");
      await fetchReservation();
    } catch (err: any) {
      setStatusError(err.message || "Failed to update reservation status.");
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingPayment(true);
      setPaymentError(null);
      const parsedAmount = parseFloat(payAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setPaymentError("Please provide a valid payment amount greater than zero.");
        setSubmittingPayment(false);
        return;
      }

      await recordAdminPayment({
        reservation_id: reservationId,
        amount: parsedAmount,
        payment_method: payMethod,
        notes: payNotes,
      });
      setPaymentModalOpen(false);
      setPayNotes("");
      await fetchReservation();
    } catch (err: any) {
      setPaymentError(err.message || "Failed to record payment.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handlePaymentStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    try {
      setSubmittingPaymentStatus(true);
      setPaymentStatusError(null);

      await updateAdminPaymentStatus(
        selectedPayment.id,
        newPaymentStatus as "pending" | "completed" | "failed" | "cancelled",
        paymentStatusNote
      );

      setPaymentStatusModalOpen(false);
      setSelectedPayment(null);
      setPaymentStatusNote("");
      await fetchReservation();
    } catch (err: any) {
      setPaymentStatusError(err.message || "Failed to update payment status.");
    } finally {
      setSubmittingPaymentStatus(false);
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

      const remainingAllowed = Number(refundPayment.remaining_refundable ?? refundPayment.amount);
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
      await fetchReservation();
    } catch (err: any) {
      setRefundModalError(err.message || "Failed to process refund.");
    } finally {
      setSubmittingRefund(false);
    }
  };

  if (loading && !reservation) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-forest-700 font-sans">Loading reservation details...</p>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-8 text-center max-w-xl mx-auto my-12">
        <h3 className="text-lg font-serif font-bold text-red-900 mb-2">Reservation Not Found</h3>
        <p className="text-sm mb-6">{error || "Unable to locate this reservation."}</p>
        <Link
          href={`${portalBase}/reservations`}
          className="inline-flex items-center px-4 py-2 bg-forest-900 text-white rounded-lg hover:bg-forest-800 transition"
        >
          ← Back to Reservations
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

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "partially_paid":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "unpaid":
      default:
        return "bg-rose-100 text-rose-800 border-rose-200";
    }
  };

  const totalPrice = Number(
    reservation.pricing?.total_price_php ?? reservation.total_price_php ?? 0
  );
  const grossPaid = Number(
    reservation.gross_paid_php ??
      reservation.payments
        ?.filter((p: any) => p.status === "completed")
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) ??
      0
  );
  const completedRefunds = Number(
    reservation.refunded_php ??
      reservation.refunds
        ?.filter((r: any) => r.status === "completed")
        .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0) ??
      0
  );
  const netPaid = Number(
    reservation.net_paid_php ??
      reservation.total_paid_php ??
      Math.max(0, grossPaid - completedRefunds)
  );
  const remainingBalance = Number(
    reservation.remaining_balance_php ?? Math.max(0, totalPrice - netPaid)
  );
  const paymentStatus =
    reservation.payment_status ||
    (remainingBalance === 0 ? "paid" : netPaid > 0 ? "partially_paid" : "unpaid");

  const checkInDate = reservation.stay?.check_in ?? reservation.check_in;
  const checkOutDate = reservation.stay?.check_out ?? reservation.check_out;
  const stayNights = Number(reservation.stay?.nights ?? reservation.nights ?? 1);
  const stayAdults = Number(reservation.stay?.adults ?? reservation.adults ?? 1);
  const stayChildren = Number(reservation.stay?.children ?? reservation.children ?? 0);
  const stayTotalGuests = Number(
    reservation.stay?.total_guests ??
      reservation.total_guests ??
      (stayAdults + stayChildren)
  );
  const nightlyRate = Number(
    reservation.pricing?.nightly_rate_php ??
      reservation.nightly_rate_php ??
      reservation.price_per_night_snapshot ??
      (reservation.room?.nightly_rate_php || 0)
  );

  return (
    <div className="space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-ivory-300">
        <div className="flex items-center gap-3">
          <Link
            href={`${portalBase}/reservations`}
            className="text-stone-600 hover:text-forest transition text-sm flex items-center gap-1 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 rounded"
          >
            ← Back to Reservations
          </Link>
          <span className="text-stone-300">/</span>
          <span className="font-mono text-xs bg-forest-50 text-forest px-2.5 py-1 rounded font-bold border border-forest-100 tabular-nums">
            {reservation.booking_reference}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setNewStatus(reservation.status);
              setStatusModalOpen(true);
            }}
            className="px-4 py-2 bg-white border border-stone-300 text-stone-800 hover:text-forest hover:bg-stone-50 rounded-lg text-sm font-semibold transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
          >
            Update Status
          </button>
          <button
            onClick={() => {
              setPayAmount(remainingBalance.toFixed(2));
              setPaymentModalOpen(true);
            }}
            className="px-4 py-2 bg-forest text-white hover:bg-forest-dark rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
          >
            <PlusIcon className="w-4 h-4 text-gold" />
            Record Payment
          </button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-forest-950">
                Reservation {reservation.booking_reference}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusBadge(
                  reservation.status
                )}`}
              >
                {reservation.status}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getPaymentBadge(
                  paymentStatus
                )}`}
              >
                Payment: {paymentStatus.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-sm text-stone-500">
              Booked on {formatDate(reservation.created_at)} • System ID #{reservation.id}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-ivory-50 p-4 rounded-xl border border-ivory-200">
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Total Price</p>
              <p className="text-xl font-bold font-serif text-forest tabular-nums">
                {formatCurrency(totalPrice)}
              </p>
            </div>
            <div className="w-px h-8 bg-stone-200" />
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Gross Paid</p>
              <p className="text-xl font-bold font-serif text-emerald-700 tabular-nums">
                {formatCurrency(grossPaid)}
              </p>
            </div>
            {completedRefunds > 0 && (
              <>
                <div className="w-px h-8 bg-stone-200" />
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Refunded</p>
                  <p className="text-xl font-bold font-serif text-purple-700 tabular-nums">
                    -{formatCurrency(completedRefunds)}
                  </p>
                </div>
              </>
            )}
            <div className="w-px h-8 bg-stone-200" />
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Net Paid</p>
              <p className="text-xl font-bold font-serif text-forest tabular-nums">
                {formatCurrency(netPaid)}
              </p>
            </div>
            {remainingBalance > 0 && (
              <>
                <div className="w-px h-8 bg-stone-200" />
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Balance Due</p>
                  <p className="text-xl font-bold font-serif text-rose-700 tabular-nums">
                    {formatCurrency(remainingBalance)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Details + Guest */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Stay and Financials */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stay & Room Details */}
          <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-6">
            <h2 className="text-lg font-serif font-bold text-forest mb-6 flex items-center gap-2">
              <DoorIcon className="w-5 h-5 text-gold" />
              Stay & Accommodation
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-ivory-200">
              <div>
                <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">Accommodation</p>
                <p className="text-lg font-serif font-bold text-forest-950 mt-1">
                  {reservation.room?.name || reservation.room_name_snapshot || "Resort Accommodation"}
                </p>
                <span className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded bg-ivory-100 text-stone-700 font-medium">
                  {reservation.room?.category || "Luxury Suite"}
                </span>
              </div>
              <div>
                <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">Party Size</p>
                <p className="text-base text-stone-800 font-medium mt-1">
                  {stayTotalGuests} Guest{stayTotalGuests > 1 ? "s" : ""}
                  <span className="text-xs text-stone-500 block">
                    {stayAdults} Adult{stayAdults > 1 ? "s" : ""}
                    {stayChildren > 0 ? `, ${stayChildren} Child${stayChildren > 1 ? "ren" : ""}` : ""}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="p-3 bg-ivory-50 rounded-xl border border-ivory-200">
                <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Check-in</p>
                <p className="text-base font-bold text-forest mt-1 tabular-nums">
                  {formatDate(checkInDate)}
                </p>
                <p className="text-xs text-stone-500">From 2:00 PM</p>
              </div>
              <div className="p-3 bg-ivory-50 rounded-xl border border-ivory-200">
                <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Check-out</p>
                <p className="text-base font-bold text-forest mt-1 tabular-nums">
                  {formatDate(checkOutDate)}
                </p>
                <p className="text-xs text-stone-500">By 12:00 PM</p>
              </div>
              <div className="p-3 bg-ivory-50 rounded-xl border border-ivory-200">
                <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Duration</p>
                <p className="text-base font-bold text-forest mt-1 tabular-nums">
                  {stayNights} Night{stayNights > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-stone-500">Consecutive Stay</p>
              </div>
            </div>
          </div>

          {/* Pricing Snapshot Breakdown */}
          <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-6">
            <h2 className="text-lg font-serif font-bold text-forest mb-6 flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5 text-gold" />
              Locked Financial Snapshot
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-ivory-200">
                <span className="text-stone-600">
                  Base Rate ({stayNights} night{stayNights > 1 ? "s" : ""} ×{" "}
                  {formatCurrency(nightlyRate)})
                </span>
                <span className="font-semibold text-stone-900 tabular-nums">
                  {formatCurrency(nightlyRate * stayNights)}
                </span>
              </div>
              {reservation.cleaning_fee_snapshot > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-ivory-200">
                  <span className="text-stone-600">Resort Maintenance & Cleaning</span>
                  <span className="font-semibold text-stone-900 tabular-nums">
                    {formatCurrency(reservation.cleaning_fee_snapshot)}
                  </span>
                </div>
              )}
              {reservation.service_fee_snapshot > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-ivory-200">
                  <span className="text-stone-600">Hospitality Service Fee</span>
                  <span className="font-semibold text-stone-900 tabular-nums">
                    {formatCurrency(reservation.service_fee_snapshot)}
                  </span>
                </div>
              )}
              {reservation.taxes_snapshot > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-ivory-200">
                  <span className="text-stone-600">Municipal & Resort Taxes (12%)</span>
                  <span className="font-semibold text-stone-900 tabular-nums">
                    {formatCurrency(reservation.taxes_snapshot)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 text-base font-bold text-forest-950">
                <span>Total Reservation Price</span>
                <span className="text-xl font-serif text-forest tabular-nums">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes & Special Requests */}
          <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-6">
            <h2 className="text-lg font-serif font-bold text-forest-900 mb-4">
              Special Requests & Internal Notes
            </h2>
            <div className="p-4 bg-ivory-50 rounded-xl border border-ivory-200 font-mono text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">
              {reservation.special_requests || "No special requests or staff notes recorded."}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Guest Snapshot & Actions */}
        <div className="space-y-8">
          <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-6">
            <h2 className="text-lg font-serif font-bold text-forest-900 mb-4 flex items-center gap-2">
              <UserCheckIcon className="w-5 h-5 text-gold-500" />
              Guest Snapshot
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Name</p>
                <p className="text-base font-semibold text-stone-900 mt-0.5">
                  {reservation.guest_name_snapshot || reservation.guest?.full_name || "N/A"}
                </p>
              </div>

              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Email</p>
                <a
                  href={`mailto:${reservation.guest_email_snapshot || reservation.guest?.email}`}
                  className="text-sm font-medium text-forest-700 hover:text-forest-900 hover:underline break-all mt-0.5 block"
                >
                  {reservation.guest_email_snapshot || reservation.guest?.email || "N/A"}
                </a>
              </div>

              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Phone</p>
                <a
                  href={`tel:${reservation.guest_phone_snapshot || reservation.guest?.phone}`}
                  className="text-sm font-medium text-stone-800 hover:underline mt-0.5 block"
                >
                  {reservation.guest_phone_snapshot || reservation.guest?.phone || "N/A"}
                </a>
              </div>

              {reservation.guest?.id && (
                <div className="pt-4 border-t border-ivory-200">
                  <Link
                    href={`${portalBase}/customers/${reservation.guest.id}`}
                    className="inline-flex items-center text-xs text-forest-800 hover:text-gold-700 font-semibold transition"
                  >
                    View Guest Profile & Stay History →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Status Update Card */}
          <div className="bg-forest-950 text-white rounded-2xl p-6 shadow-sm border border-forest-900">
            <h3 className="font-serif font-bold text-gold text-lg mb-2">
              Lifecycle Transition
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed mb-4">
              Transitioning to <span className="text-gold font-semibold">Confirmed</span> will atomically re-verify inventory availability to prevent double-booking.
            </p>
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setNewStatus("confirmed");
                  setStatusModalOpen(true);
                }}
                disabled={reservation.status === "confirmed"}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-forest-950 ${
                  reservation.status === "confirmed"
                    ? "bg-forest-900/90 text-stone-300 border border-forest-700/80 cursor-not-allowed opacity-75"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md focus-visible:ring-emerald-400"
                }`}
              >
                Confirm Reservation
              </button>
              <button
                onClick={() => {
                  setNewStatus("completed");
                  setStatusModalOpen(true);
                }}
                disabled={reservation.status === "completed"}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-forest-950 ${
                  reservation.status === "completed"
                    ? "bg-forest-900/90 text-stone-300 border border-forest-700/80 cursor-not-allowed opacity-75"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-md focus-visible:ring-blue-400"
                }`}
              >
                Mark Completed (Checked Out)
              </button>
              <button
                onClick={() => {
                  setNewStatus("cancelled");
                  setStatusModalOpen(true);
                }}
                disabled={reservation.status === "cancelled"}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-forest-950 ${
                  reservation.status === "cancelled"
                    ? "bg-forest-900/90 text-stone-300 border border-forest-700/80 cursor-not-allowed opacity-75"
                    : "bg-rose-700 hover:bg-rose-600 text-white shadow-md focus-visible:ring-rose-400"
                }`}
              >
                Cancel Reservation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Payments Table */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-serif font-bold text-forest">
              Verified Payment Records
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Manual staff-verified payment receipts associated with this booking.
            </p>
          </div>
          <button
            onClick={() => {
              setPayAmount(remainingBalance.toFixed(2));
              setPaymentModalOpen(true);
            }}
            className="px-4 py-2 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-dark transition flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
          >
            <PlusIcon className="w-3.5 h-3.5 text-gold" />
            Add Payment Record
          </button>
        </div>

        {(!reservation.payments || reservation.payments.length === 0) ? (
          <div className="text-center py-12 bg-ivory-50 rounded-xl border border-ivory-200">
            <CreditCardIcon className="w-8 h-8 text-stone-400 mx-auto mb-2" />
            <p className="text-sm font-serif font-bold text-stone-700">No payment receipts recorded</p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
              This reservation has no logged payments. Record cash, credit card, or bank transfer once verified.
            </p>
            <button
              onClick={() => {
                setPayAmount(remainingBalance.toFixed(2));
                setPaymentModalOpen(true);
              }}
              className="text-xs font-bold text-forest underline hover:text-gold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest rounded"
            >
              Record First Payment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-ivory-100/70 text-xs font-serif uppercase tracking-wider text-forest border-b border-ivory-300">
                <tr>
                  <th className="py-3 px-4">Receipt Ref</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Staff</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {reservation.payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-ivory-50/50 transition">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-forest tabular-nums">
                      {p.payment_reference}
                    </td>
                    <td className="py-3 px-4 text-xs capitalize text-stone-800">
                      {p.payment_method.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 px-4 font-serif font-bold text-emerald-800 tabular-nums">
                      <div>{formatCurrency(p.amount)}</div>
                      {Number(p.refunded_amount || 0) > 0 && (
                        <div className="text-[10px] font-sans font-medium text-purple-700">
                          Refunded: {formatCurrency(p.refunded_amount)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          p.status === "completed"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : p.status === "pending"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : p.status === "refunded"
                            ? "bg-purple-100 text-purple-800 border-purple-200"
                            : "bg-rose-100 text-rose-800 border-rose-200"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-stone-600">
                      {p.recorded_by}
                    </td>
                    <td className="py-3 px-4 text-xs text-stone-500 tabular-nums">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="py-3 px-4 text-xs text-stone-500 max-w-xs truncate">
                      {p.notes || "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPayment(p);
                            setNewPaymentStatus(p.status === "refunded" ? "cancelled" : p.status);
                            setPaymentStatusNote(p.notes || "");
                            setPaymentStatusError(null);
                            setPaymentStatusModalOpen(true);
                          }}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md border border-stone-200 bg-white text-forest hover:bg-forest hover:text-white transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                        >
                          Update Status
                        </button>
                        {p.status === "completed" && Number(p.remaining_refundable ?? p.amount) > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setRefundPayment(p);
                              setRefundAmount(String(p.remaining_refundable ?? p.amount));
                              setRefundReason("");
                              setRefundNotes("");
                              setRefundModalError(null);
                              setRefundModalOpen(true);
                            }}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reservation.refunds && reservation.refunds.length > 0 && (
          <div className="mt-8 pt-6 border-t border-ivory-200">
            <h3 className="text-base font-serif font-bold text-purple-950 mb-3">
              Refund Records ({reservation.refunds.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-stone-700">
                <thead className="bg-purple-50/70 text-xs font-serif uppercase tracking-wider text-purple-900 border-b border-purple-200">
                  <tr>
                    <th className="py-2.5 px-4">Refund Ref</th>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Reason</th>
                    <th className="py-2.5 px-4">Requested By</th>
                    <th className="py-2.5 px-4">Approved By</th>
                    <th className="py-2.5 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100">
                  {reservation.refunds.map((r: any) => (
                    <tr key={r.id} className="hover:bg-purple-50/30 transition">
                      <td className="py-2.5 px-4 font-mono text-xs font-bold text-purple-900 tabular-nums">
                        {r.refund_reference}
                      </td>
                      <td className="py-2.5 px-4 font-serif font-bold text-purple-800 tabular-nums">
                        -{formatCurrency(r.amount)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            r.status === "completed"
                              ? "bg-purple-100 text-purple-800 border-purple-200"
                              : r.status === "pending"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-rose-100 text-rose-800 border-rose-200"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-stone-800">
                        {r.reason}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-stone-600">
                        {r.requested_by || "Staff"}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-stone-600">
                        {r.approved_by || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-stone-500 tabular-nums">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* GUEST COMMUNICATIONS & NOTIFICATION HISTORY */}
      <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ivory-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-serif font-bold text-forest">
                Guest Communications & Notifications
              </h2>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold/20 text-forest border border-gold/30">
                <BellIcon className="w-3.5 h-3.5 text-forest" />
                {notifications.length} Logged
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Automated delivery history and staff on-demand triggers for this reservation.
            </p>
          </div>

          {/* Trigger Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSendNotification("booking_confirmation")}
              disabled={sendingNotifType !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-forest/20 bg-white hover:bg-forest/5 text-xs font-semibold text-forest transition shadow-xs disabled:opacity-50"
            >
              <MailIcon className="w-3.5 h-3.5" />
              <span>{sendingNotifType === "booking_confirmation" ? "Sending..." : "Resend Confirmation"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSendNotification("payment_reminder")}
              disabled={sendingNotifType !== null || remainingBalance <= 0}
              title={remainingBalance <= 0 ? "Reservation is fully paid" : "Send payment reminder"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-800 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCardIcon className="w-3.5 h-3.5" />
              <span>{sendingNotifType === "payment_reminder" ? "Sending..." : "Send Payment Reminder"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSendNotification("checkin_reminder")}
              disabled={sendingNotifType !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-xs font-semibold text-purple-800 transition shadow-xs disabled:opacity-50"
            >
              <DoorIcon className="w-3.5 h-3.5" />
              <span>{sendingNotifType === "checkin_reminder" ? "Sending..." : "Send Check-In Reminder"}</span>
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {notifSuccessMsg && (
          <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
            <div className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notifSuccessMsg}</span>
            </div>
            <button onClick={() => setNotifSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {notifErrorMsg && (
          <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            <div className="flex items-center gap-2">
              <CloseIcon className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{notifErrorMsg}</span>
            </div>
            <button onClick={() => setNotifErrorMsg(null)} className="text-rose-600 hover:text-rose-900">
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Notifications Table */}
        {loadingNotifications ? (
          <div className="py-8 flex justify-center items-center">
            <div className="w-6 h-6 border-2 border-forest border-t-gold rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-xs italic">
            No notifications recorded yet for this reservation. Use the buttons above to dispatch messages.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory-50 text-[10px] font-bold uppercase tracking-wider text-stone-500 border-b border-ivory-200">
                <tr>
                  <th className="py-2.5 px-4">Event Type</th>
                  <th className="py-2.5 px-4">Recipient</th>
                  <th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-4">Delivery Status</th>
                  <th className="py-2.5 px-4">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {notifications.map((notif) => (
                  <tr key={notif.id} className="hover:bg-ivory-50/50 transition">
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-stone-800 capitalize">
                        {notif.notification_type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-stone-700">
                      {notif.recipient_email}
                      <span className="text-[10px] text-stone-400 block capitalize">
                        {notif.recipient_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-stone-700 max-w-xs truncate" title={notif.subject}>
                      {notif.subject}
                    </td>
                    <td className="py-2.5 px-4">
                      {notif.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Sent
                        </span>
                      ) : notif.status === "queued" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Queued
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-stone-500 tabular-nums">
                      {formatDate(notif.sent_at || notif.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* UPDATE RESERVATION STATUS MODAL */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-ivory-300">
            <h3 className="text-xl font-serif font-bold text-forest mb-2">
              Update Reservation Status
            </h3>
            <p className="text-xs text-stone-500 mb-6">
              Change the status of booking <span className="font-mono font-bold tabular-nums">{reservation.booking_reference}</span>.
            </p>

            {statusError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg mb-4 border border-red-200">
                {statusError}
              </div>
            )}

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Target Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-ivory-50 border border-stone-300 rounded-lg text-sm text-forest focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed (Allocates Room)</option>
                  <option value="completed">Completed (Checked-Out)</option>
                  <option value="cancelled">Cancelled (Releases Room)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Staff Audit Note (Optional)
                </label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g., Guest phoned to confirm arrival at 4 PM..."
                  rows={3}
                  className="w-full px-3 py-2 bg-ivory-50 border border-stone-300 rounded-lg text-xs text-forest focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-ivory-200">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  disabled={submittingStatus}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 hover:text-stone-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStatus}
                  className="px-5 py-2 bg-forest text-white rounded-lg text-xs font-bold hover:bg-forest-dark disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  {submittingStatus ? "Updating..." : "Save Transition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-ivory-300">
            <h3 className="text-xl font-serif font-bold text-forest mb-2">
              Record Verified Payment
            </h3>
            <p className="text-xs text-stone-500 mb-6">
              Log an in-person or verified bank transaction for <span className="font-mono font-bold tabular-nums">{reservation.booking_reference}</span>. New payments are logged as <span className="font-semibold text-amber-700">Pending</span> until verified.
            </p>

            {paymentError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg mb-4 border border-red-200">
                {paymentError}
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Amount (PHP) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-ivory-50 border border-stone-300 rounded-lg text-sm text-forest font-bold focus:outline-none focus:ring-2 focus:ring-gold tabular-nums"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Remaining balance due: <span className="font-semibold text-stone-800 tabular-nums">{formatCurrency(remainingBalance)}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Payment Method *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
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
                  Transaction Notes / POS Ref
                </label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g., Terminal receipt #48921 verified by front desk..."
                  rows={2}
                  className="w-full px-3 py-2 bg-ivory-50 border border-stone-300 rounded-lg text-xs text-forest focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-ivory-200">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  disabled={submittingPayment}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 hover:text-stone-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 bg-forest text-white rounded-lg text-xs font-bold hover:bg-forest-dark disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  {submittingPayment ? "Recording..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE PAYMENT STATUS MODAL */}
      {paymentStatusModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-ivory-300">
            <h3 className="text-xl font-serif font-bold text-forest mb-1">
              Update Payment Status
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Update status for receipt <span className="font-mono font-bold text-forest">{selectedPayment.payment_reference}</span>.
            </p>

            {paymentStatusError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg mb-4 border border-red-200">
                {paymentStatusError}
              </div>
            )}

            <div className="bg-ivory-50 p-3.5 rounded-xl border border-ivory-200 mb-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-500">Method:</span>
                <span className="font-medium text-stone-800 capitalize">
                  {selectedPayment.payment_method?.replace(/_/g, " ")}
                </span>
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
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    selectedPayment.status === "completed"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : selectedPayment.status === "pending"
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : selectedPayment.status === "refunded"
                      ? "bg-purple-100 text-purple-800 border-purple-200"
                      : "bg-rose-100 text-rose-800 border-rose-200"
                  }`}
                >
                  {selectedPayment.status}
                </span>
              </div>
            </div>

            <form onSubmit={handlePaymentStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Target Status *
                </label>
                <select
                  value={newPaymentStatus}
                  onChange={(e) => setNewPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-ivory-50 border border-stone-300 rounded-lg text-xs text-forest focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="completed">Completed (Credits to Reservation Paid Balance)</option>
                  <option value="pending">Pending (Awaiting Verification)</option>
                  <option value="cancelled">Cancelled (Voided Receipt)</option>
                  <option value="failed">Failed / Declined (Rejected)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Staff Audit Note (Optional)
                </label>
                <textarea
                  value={paymentStatusNote}
                  onChange={(e) => setPaymentStatusNote(e.target.value)}
                  placeholder="e.g., Funds verified in bank account / cash received at reception..."
                  rows={2}
                  className="w-full px-3 py-2 bg-ivory-50 border border-stone-300 rounded-lg text-xs text-forest focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-ivory-200">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatusModalOpen(false);
                    setSelectedPayment(null);
                  }}
                  disabled={submittingPaymentStatus}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 hover:text-stone-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPaymentStatus}
                  className="px-5 py-2 bg-forest text-white rounded-lg text-xs font-bold hover:bg-forest-dark disabled:opacity-50 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  {submittingPaymentStatus ? "Updating..." : "Save Status"}
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
            <h3 className="text-xl font-serif font-bold text-purple-950 mb-2">
              Issue Payment Refund
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Issue a full or partial refund against receipt{" "}
              <span className="font-mono font-bold text-forest">
                {refundPayment.payment_reference}
              </span>
              . This creates an auditable refund record and deducts from net collections.
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
                  {reservation.booking_reference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Method:</span>
                <span className="font-medium text-stone-800 capitalize">
                  {refundPayment.payment_method?.replace(/_/g, " ")}
                </span>
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
                  placeholder="e.g., Guest cancellation / room downgrade / duplicate charge..."
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
                  placeholder="e.g., Authorized by front desk manager / reversal reference #..."
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
