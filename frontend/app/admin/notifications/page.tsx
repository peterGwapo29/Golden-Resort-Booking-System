"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getAdminNotifications,
  retryAdminNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type BookingNotificationItem,
  type NotificationMetrics,
} from "@/lib/admin-api";
import {
  SearchIcon,
  FilterIcon,
  BellIcon,
  MailIcon,
  CheckIcon,
  InfoIcon,
  CloseIcon,
} from "@/components/ui/Icons";

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<BookingNotificationItem[]>([]);
  const [metrics, setMetrics] = useState<NotificationMetrics>({
    total: 0,
    unread: 0,
    sent: 0,
    queued: 0,
    failed: 0,
  });
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [readStatus, setReadStatus] = useState("unread");
  const [notificationType, setNotificationType] = useState("all");
  const [recipientType, setRecipientType] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  // Retrying and in-flight read deduplication states
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const inFlightReads = useRef<Set<number>>(new Set());

  // Detail modal
  const [selectedNotif, setSelectedNotif] = useState<BookingNotificationItem | null>(null);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminNotifications({
        search,
        status,
        read_status: readStatus,
        notification_type: notificationType,
        recipient_type: recipientType,
        from_date: fromDate,
        to_date: toDate,
        page,
      });
      setNotifications(res.data);
      setMetrics(res.metrics);
      setMeta(res.meta);
    } catch (err: any) {
      setError(err.message || "Failed to load notification logs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [status, readStatus, notificationType, recipientType, fromDate, toDate, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchNotifications();
  };

  const handleRetry = async (notifId: number) => {
    try {
      setRetryingId(notifId);
      setActionSuccess(null);
      const res = await retryAdminNotification(notifId);
      setActionSuccess(res.message);
      await fetchNotifications();
    } catch (err: any) {
      setError(err.message || "Failed to retry notification delivery.");
    } finally {
      setRetryingId(null);
    }
  };

  /**
   * Applies an automatic read transition across local state, KPIs, modal, and header bell.
   */
  const applyNotificationRead = (
    notifId: number,
    readAt?: string | null,
    serverUnreadCount?: number
  ) => {
    const resolvedReadAt = readAt || new Date().toISOString();

    // 1. Update notifications array in local state
    setNotifications((prev) => {
      if (readStatus === "unread") {
        return prev.filter((n) => n.id !== notifId);
      }
      return prev.map((n) =>
        n.id === notifId
          ? {
              ...n,
              is_read: true,
              read_at: resolvedReadAt,
            }
          : n
      );
    });

    // 2. Update KPI summary metrics
    setMetrics((prev) => ({
      ...prev,
      unread:
        typeof serverUnreadCount === "number"
          ? serverUnreadCount
          : Math.max(0, prev.unread - 1),
    }));

    // 3. Update modal item if open
    setSelectedNotif((prev) =>
      prev && prev.id === notifId
        ? {
            ...prev,
            is_read: true,
            read_at: resolvedReadAt,
          }
        : prev
    );

    // 4. Synchronize header notification bell
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gr:notifications-updated"));
    }
  };

  /**
   * Automatically marks notification as read and navigates to the associated reservation details page.
   */
  const handleOpenBooking = async (notif: BookingNotificationItem) => {
    // If no reservation is associated, open the inspection view instead of navigating to an invalid route
    if (!notif.reservation_id) {
      handleOpenInspection(notif);
      return;
    }

    // Automatically mark as read if currently unread and not already in flight
    if (!notif.is_read && !inFlightReads.current.has(notif.id)) {
      inFlightReads.current.add(notif.id);
      try {
        const res = await markNotificationAsRead(notif.id);
        applyNotificationRead(notif.id, res.data?.read_at, res.unread_count);
      } catch (err: any) {
        console.error("Failed to mark notification as read before navigation:", err);
      } finally {
        inFlightReads.current.delete(notif.id);
      }
    }

    // Navigate to associated reservation details
    router.push(`/admin/reservations/${notif.reservation_id}`);
  };

  /**
   * Opens the inspection modal and automatically marks the notification as read upon review.
   */
  const handleOpenInspection = async (notif: BookingNotificationItem) => {
    setSelectedNotif(notif);

    // Automatically mark as read if currently unread and not already in flight
    if (!notif.is_read && !inFlightReads.current.has(notif.id)) {
      inFlightReads.current.add(notif.id);
      try {
        const res = await markNotificationAsRead(notif.id);
        applyNotificationRead(notif.id, res.data?.read_at, res.unread_count);
      } catch (err: any) {
        console.error("Failed to mark notification as read upon inspection:", err);
      } finally {
        inFlightReads.current.delete(notif.id);
      }
    }
  };


  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      setActionSuccess(null);
      const res = await markAllNotificationsAsRead();
      setActionSuccess(res.message);
      window.dispatchEvent(new CustomEvent("gr:notifications-updated"));
      await fetchNotifications();
    } catch (err: any) {
      setError(err.message || "Failed to mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    booking_confirmation: { label: "Booking Confirmation", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    internal_new_booking: { label: "Staff Booking Alert", color: "bg-blue-50 text-blue-700 border-blue-200" },
    payment_confirmation: { label: "Payment Receipt", color: "bg-teal-50 text-teal-700 border-teal-200" },
    payment_reminder: { label: "Payment Reminder", color: "bg-amber-50 text-amber-700 border-amber-200" },
    checkin_reminder: { label: "Check-In Reminder", color: "bg-purple-50 text-purple-700 border-purple-200" },
    booking_cancellation: { label: "Cancellation Notice", color: "bg-rose-50 text-rose-700 border-rose-200" },
    refund_update: { label: "Refund Notice", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-forest sm:text-3xl">
              Automated Booking Notifications
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold/20 text-forest border border-gold/30">
              <BellIcon className="w-3.5 h-3.5 text-forest" />
              Event Engine
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Real-time audit log of automated guest confirmations, receipts, reminders, and resort staff alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {metrics.unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs hover:bg-stone-50 transition disabled:opacity-50"
              title="Mark all notifications as read"
            >
              <CheckIcon className="w-4 h-4 text-emerald-600" />
              <span>{markingAll ? "Marking..." : "Mark All as Read"}</span>
            </button>
          )}

          <button
            onClick={() => fetchNotifications()}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-forest/20 bg-white px-4 py-2 text-xs font-semibold text-forest shadow-xs hover:bg-forest/5 transition"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-forest border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Refresh Logs</span>
            )}
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {actionSuccess && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
          <div className="flex items-center gap-2">
            <InfoIcon className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-600 hover:text-rose-900"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-[11px] font-semibold tracking-wider uppercase text-stone-500">
            Total Dispatched
          </p>
          <p className="text-2xl font-serif font-bold text-forest mt-1 tabular-nums">
            {metrics.total.toLocaleString()}
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5">All event notifications</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-[11px] font-semibold tracking-wider uppercase text-rose-700">
            Unread Notifications
          </p>
          <p className="text-2xl font-serif font-bold text-rose-600 mt-1 tabular-nums">
            {metrics.unread.toLocaleString()}
          </p>
          <p className="text-[10px] text-rose-700/70 mt-0.5">Awaiting acknowledgement</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-[11px] font-semibold tracking-wider uppercase text-emerald-700">
            Delivered / Sent
          </p>
          <p className="text-2xl font-serif font-bold text-emerald-600 mt-1 tabular-nums">
            {metrics.sent.toLocaleString()}
          </p>
          <p className="text-[10px] text-emerald-700/70 mt-0.5">Successful transmissions</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-[11px] font-semibold tracking-wider uppercase text-amber-700">
            Queued in Flight
          </p>
          <p className="text-2xl font-serif font-bold text-amber-600 mt-1 tabular-nums">
            {metrics.queued.toLocaleString()}
          </p>
          <p className="text-[10px] text-amber-700/70 mt-0.5">Awaiting queue worker</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-[11px] font-semibold tracking-wider uppercase text-stone-600">
            Delivery Failures
          </p>
          <p className="text-2xl font-serif font-bold text-stone-700 mt-1 tabular-nums">
            {metrics.failed.toLocaleString()}
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5">Requires retry or review</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by recipient email, subject, or booking reference..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-forest focus:border-forest"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-forest text-white rounded-xl text-xs font-semibold hover:bg-forest-dark transition"
          >
            <SearchIcon className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2 border-t border-stone-100 text-xs">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-1">
              Event Type
            </label>
            <select
              value={notificationType}
              onChange={(e) => {
                setNotificationType(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs focus:ring-1 focus:ring-forest"
            >
              <option value="all">All Events</option>
              <option value="booking_confirmation">Booking Confirmation</option>
              <option value="internal_new_booking">Staff Booking Alert</option>
              <option value="payment_confirmation">Payment Receipt</option>
              <option value="payment_reminder">Payment Reminder</option>
              <option value="checkin_reminder">Check-In Reminder</option>
              <option value="booking_cancellation">Cancellation Notice</option>
              <option value="refund_update">Refund Update</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-1">
              Read Status
            </label>
            <select
              value={readStatus}
              onChange={(e) => {
                setReadStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs focus:ring-1 focus:ring-forest"
            >
              <option value="all">All Read Statuses</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-1">
              Delivery Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs focus:ring-1 focus:ring-forest"
            >
              <option value="all">All Delivery Statuses</option>
              <option value="sent">Sent</option>
              <option value="queued">Queued</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-1">
              Recipient Group
            </label>
            <select
              value={recipientType}
              onChange={(e) => {
                setRecipientType(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs focus:ring-1 focus:ring-forest"
            >
              <option value="all">All Recipient Types</option>
              <option value="guest">Guests</option>
              <option value="staff">Resort Staff</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs focus:ring-1 focus:ring-forest"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs focus:ring-1 focus:ring-forest"
            />
          </div>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-8 h-8 border-3 border-forest border-t-gold rounded-full animate-spin mb-3" />
            <p className="text-xs text-stone-500">Loading automated notification logs...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-3">
              <MailIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-stone-800">No Notifications Found</h3>
            <p className="text-xs text-stone-500 max-w-sm mt-1">
              There are no automated notifications matching your filter criteria. Try adjusting your search or date filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-[10px] uppercase font-bold tracking-wider text-stone-500 border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Delivery Status</th>
                  <th className="py-3 px-4">Sent / Queued At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {notifications.map((notif) => {
                  const typeMeta = typeLabels[notif.notification_type] || {
                    label: notif.notification_type,
                    color: "bg-stone-100 text-stone-700 border-stone-200",
                  };

                  return (
                    <tr
                      key={notif.id}
                      className={`hover:bg-stone-50/70 transition ${
                        !notif.is_read ? "bg-amber-50/20" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {!notif.is_read && (
                            <span
                              className="w-2 h-2 rounded-full bg-rose-500 shrink-0"
                              title="Unread notification"
                            />
                          )}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeMeta.color}`}
                          >
                            {typeMeta.label}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-stone-900 truncate max-w-[180px]" title={notif.recipient_email}>
                          {notif.recipient_email}
                        </div>
                        <div className="text-[10px] text-stone-400 capitalize">
                          {notif.recipient_type} • {notif.channel}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {notif.reservation_id ? (
                          <button
                            type="button"
                            onClick={() => handleOpenBooking(notif)}
                            className="font-mono text-xs font-semibold text-forest hover:text-gold hover:underline text-left cursor-pointer"
                            title={`Open booking details #${notif.reservation_id}`}
                          >
                            {notif.booking_reference || `#${notif.reservation_id}`}
                          </button>
                        ) : (
                          <span className="text-stone-400 italic">None</span>
                        )}
                        {notif.guest_name && (
                          <div className="text-[10px] text-stone-500 truncate max-w-[140px]">
                            {notif.guest_name}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-[220px]">
                        <p
                          className={`truncate text-stone-800 ${
                            !notif.is_read ? "font-semibold text-stone-950" : ""
                          }`}
                          title={notif.subject}
                        >
                          {notif.subject}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        {notif.status === "sent" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Sent
                          </span>
                        ) : notif.status === "queued" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Queued
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Failed
                          </span>
                        )}
                        {notif.error_message && (
                          <p className="text-[10px] text-rose-600 truncate max-w-[140px] mt-0.5" title={notif.error_message}>
                            {notif.error_message}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4 text-stone-500 whitespace-nowrap text-[11px]">
                        {notif.sent_at
                          ? new Date(notif.sent_at).toLocaleString("en-PH", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : new Date(notif.created_at).toLocaleString("en-PH", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {notif.status === "failed" && (
                            <button
                              type="button"
                              onClick={() => handleRetry(notif.id)}
                              disabled={retryingId === notif.id}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-semibold transition disabled:opacity-50"
                            >
                              {retryingId === notif.id ? "Retrying..." : "Retry"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              notif.reservation_id
                                ? handleOpenBooking(notif)
                                : handleOpenInspection(notif)
                            }
                            className="px-2.5 py-1 border border-stone-200 hover:bg-stone-100 rounded-lg text-[10px] font-medium text-stone-700 transition"
                            title={
                              notif.reservation_id
                                ? "Open booking details and mark as read"
                                : "Review notification details and mark as read"
                            }
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenInspection(notif)}
                            className="px-2 py-1 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg text-[10px] font-medium transition"
                            title="Inspect notification audit details"
                          >
                            Audit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-stone-200 bg-stone-50 text-xs">
            <span className="text-stone-500">
              Showing page <strong className="text-stone-800">{meta.current_page}</strong> of{" "}
              <strong className="text-stone-800">{meta.last_page}</strong> ({meta.total} total logs)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.current_page <= 1}
                className="px-3 py-1 rounded-lg border border-stone-200 bg-white font-medium text-stone-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={meta.current_page >= meta.last_page}
                className="px-3 py-1 rounded-lg border border-stone-200 bg-white font-medium text-stone-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notification Detail Inspection Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Notification Audit #{selectedNotif.id}
                </span>
                <h3 className="font-serif font-bold text-lg text-forest">
                  {selectedNotif.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200/60">
                <div>
                  <p className="text-[10px] uppercase font-bold text-stone-400">Event Type</p>
                  <p className="font-medium text-stone-800 capitalize">
                    {selectedNotif.notification_type.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-stone-400">Target Group</p>
                  <p className="font-medium text-stone-800 capitalize">
                    {selectedNotif.recipient_type} ({selectedNotif.channel})
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-stone-400">Recipient Email</p>
                  <p className="font-medium text-stone-800 break-all">{selectedNotif.recipient_email}</p>
                </div>
                <div>
                  <p hidden className="text-[10px] uppercase font-bold text-stone-400">Read Status</p>
                  <p hidden className="font-medium text-stone-800 flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selectedNotif.is_read ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    <span>
                      {selectedNotif.is_read
                        ? `Read (${selectedNotif.read_at ? new Date(selectedNotif.read_at).toLocaleDateString() : "Yes"})`
                        : "Unread"}
                    </span>
                  </p>
                </div>
              </div>

              {selectedNotif.booking_reference && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-stone-400">Associated Stay</p>
                  <p className="font-mono text-stone-800">
                    {selectedNotif.booking_reference} {selectedNotif.room_name && `(${selectedNotif.room_name})`}
                  </p>
                </div>
              )}

              {selectedNotif.error_message && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                  <p className="font-bold text-[10px] uppercase">Error Diagnostics:</p>
                  <p className="font-mono text-[11px] mt-1 break-all">{selectedNotif.error_message}</p>
                </div>
              )}

              <div className="text-[10px] text-stone-400 pt-2 border-t border-stone-100 flex justify-between">
                <span>Created: {new Date(selectedNotif.created_at).toLocaleString()}</span>
                {selectedNotif.sent_at && <span>Delivered: {new Date(selectedNotif.sent_at).toLocaleString()}</span>}
              </div>
            </div>

            <div className="pt-2 flex justify-end items-center gap-2 border-t border-stone-100">
              {selectedNotif.status === "failed" && (
                <button
                  type="button"
                  onClick={() => {
                    handleRetry(selectedNotif.id);
                    setSelectedNotif(null);
                  }}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl"
                >
                  Retry Delivery Now
                </button>
              )}
              {selectedNotif.reservation_id && (
                <button
                  type="button"
                  onClick={() => {
                    const resId = selectedNotif.reservation_id;
                    setSelectedNotif(null);
                    router.push(`/admin/reservations/${resId}`);
                  }}
                  className="px-4 py-1.5 bg-forest hover:bg-forest-dark text-white font-semibold text-xs rounded-xl"
                >
                  Open Booking &rarr;
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="px-4 py-1.5 bg-stone-100 hover:bg-stone-200 font-semibold text-xs text-stone-700 rounded-xl"
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
