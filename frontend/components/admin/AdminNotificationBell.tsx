"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAdminUnreadNotificationCount } from "@/lib/admin-api";
import { BellIcon } from "@/components/ui/Icons";

export default function AdminNotificationBell() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCount = useCallback(async () => {
    try {
      const res = await getAdminUnreadNotificationCount();
      if (typeof res?.unread_count === "number") {
        setUnreadCount(res.unread_count);
      }
    } catch {
      // Gracefully maintain last-known count on network/auth error without crashing header
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();

    // Refresh count when returning to window/tab
    const handleFocus = () => {
      fetchCount();
    };
    window.addEventListener("focus", handleFocus);

    // Custom event listener so other components can trigger an instant count refresh
    const handleCustomUpdate = () => {
      fetchCount();
    };
    window.addEventListener("gr:notifications-updated", handleCustomUpdate);

    // Gentle 60s background polling with cleanup
    const timer = setInterval(() => {
      fetchCount();
    }, 60000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("gr:notifications-updated", handleCustomUpdate);
      clearInterval(timer);
    };
  }, [fetchCount]);

  // Refresh count when navigating between admin routes
  useEffect(() => {
    fetchCount();
  }, [pathname, fetchCount]);

  const displayBadge = unreadCount > 99 ? "99+" : String(unreadCount);
  const accessibleLabel =
    unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : "Notifications, no unread";

  return (
    <Link
      href="/admin/notifications"
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className="relative flex items-center justify-center p-2 rounded-lg border border-forest/20 text-forest hover:bg-forest/5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
    >
      <BellIcon className="h-4 w-4" />

      {/* Unread badge: hidden when zero */}
      {!isLoading && unreadCount > 0 && (
        <span
          className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white shadow-xs animate-in fade-in zoom-in-75 duration-150 tabular-nums"
          aria-hidden="true"
        >
          {displayBadge}
        </span>
      )}
    </Link>
  );
}
