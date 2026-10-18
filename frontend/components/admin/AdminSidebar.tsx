"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/lib/admin-auth";
import {
  DashboardIcon,
  DoorIcon,
  CalendarIcon,
  SparklesIcon,
  KeyIcon,
  ClipboardListIcon,
  UserCheckIcon,
  UsersIcon,
  CreditCardIcon,
  LogoutIcon,
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BellIcon,
  WrenchIcon,
} from "@/components/ui/Icons";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard & Analytics", href: "/admin", icon: DashboardIcon },
    ],
  },
  {
    title: "Resort Operations",
    items: [
      { label: "Accommodations", href: "/admin/rooms", icon: DoorIcon },
      { label: "Availability Calendar", href: "/admin/calendar", icon: CalendarIcon },
      { label: "Housekeeping", href: "/admin/housekeeping", icon: SparklesIcon },
      { label: "Maintenance", href: "/admin/maintenance", icon: WrenchIcon },
      { label: "Front Desk (Check-In)", href: "/admin/check-in-out", icon: KeyIcon },
    ],
  },
  {
    title: "Bookings & Finance",
    items: [
      { label: "Reservations", href: "/admin/reservations", icon: ClipboardListIcon },
      { label: "Customers", href: "/admin/customers", icon: UserCheckIcon },
      { label: "Payments & Refunds", href: "/admin/payments", icon: CreditCardIcon },
      { label: "Notifications", href: "/admin/notifications", icon: BellIcon },
    ],
  },
  {
    title: "System & Access",
    items: [
      { label: "Staff Accounts", href: "/admin/staff", icon: UsersIcon, adminOnly: true },
    ],
  },
];

/**
 * Determine if a route is active based on exact match for /admin
 * and delimited prefix match for nested resources (e.g. /admin/reservations/12).
 */
export function isRouteActive(currentPath: string, linkHref: string): boolean {
  if (linkHref === "/admin") {
    return currentPath === "/admin";
  }
  return currentPath === linkHref || currentPath.startsWith(`${linkHref}/`);
}

interface AdminSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function AdminSidebar({
  mobileOpen,
  setMobileOpen,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAdminAuth();

  // Desktop collapse state (persisted to localStorage)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("gr_admin_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // Ignore localStorage access issues
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem("gr_admin_sidebar_collapsed", String(next));
    } catch {
      // Ignore localStorage write issues
    }
  };

  // Keyboard Escape listener & body scroll lock for mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen, setMobileOpen]);

  // Prevent layout jump on hydration
  const collapsed = mounted ? isCollapsed : false;

  return (
    <>
      {/* ======================================================================
          DESKTOP SIDEBAR
          Fixed height, self-contained vertical scrolling, collapsible to w-20
         ====================================================================== */}
      <aside
        aria-label="Administrative Navigation"
        className={`hidden lg:flex flex-col h-full shrink-0 border-r border-forest/10 bg-forest text-white transition-[width] duration-200 ease-in-out relative ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div
          className={`shrink-0 border-b border-white/10 flex items-center transition-all ${
            collapsed ? "p-4 justify-center" : "p-5 justify-between"
          }`}
        >
          <Link
            href="/admin"
            className="group flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-lg p-0.5"
            title="Golden Resort Administrative Portal"
          >
            {collapsed ? (
              <span className="font-serif text-2xl font-bold tracking-wider text-gold group-hover:text-white transition-colors">
                GR
              </span>
            ) : (
              <div>
                <span className="block text-[10px] font-semibold tracking-[0.25em] text-gold uppercase">
                  Administrative Portal
                </span>
                <span className="block font-serif text-xl font-medium tracking-wide text-white group-hover:text-gold transition-colors">
                  Golden Resort
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse / Expand Toggle Button */}
          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              aria-expanded="true"
              className="rounded-lg p-1.5 text-white/70 hover:bg-forest-dark/70 hover:text-gold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              title="Collapse sidebar to icon-only mode"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="shrink-0 flex justify-center py-2 border-b border-white/5">
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              aria-expanded="false"
              className="rounded-lg p-2 text-white/70 hover:bg-forest-dark/70 hover:text-gold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              title="Expand sidebar"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Primary Vertically Scrollable Navigation */}
        <nav
          aria-label="Main Navigation"
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4 [scrollbar-width:thin] [scrollbar-color:rgba(198,166,107,0.3)_transparent]"
        >
          {ADMIN_NAV_SECTIONS.map((section, sIdx) => {
            const visibleItems = section.items.filter(
              (item) => !item.adminOnly || user?.role === "admin"
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                {/* Section Header */}
                {collapsed ? (
                  sIdx > 0 && (
                    <div
                      role="separator"
                      aria-label={section.title}
                      className="h-px bg-white/10 my-2 mx-1"
                      title={section.title}
                    />
                  )
                ) : (
                  <div className="px-3 pt-2 pb-1">
                    <span className="text-[10px] font-bold tracking-widest text-gold/80 uppercase select-none">
                      {section.title}
                    </span>
                  </div>
                )}

                {/* Section Items */}
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = isRouteActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-forest ${
                        collapsed
                          ? "justify-center px-2 py-2.5"
                          : "px-3.5 py-2.5 text-xs font-medium"
                      } ${
                        active
                          ? "bg-gold text-forest-dark font-semibold shadow-xs"
                          : "text-white/80 hover:bg-forest-dark/70 hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`shrink-0 transition-transform ${
                          collapsed ? "h-5 w-5" : "h-4 w-4"
                        } ${active ? "text-forest-dark" : "text-white/80"}`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
        </nav>

        {/* Administrator Footer (User profile & Sign Out) */}
        <div className="shrink-0 border-t border-white/10 p-3 bg-forest-dark/40">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold"
                title={`${user?.name || "Admin"} (${user?.role || "Staff"})`}
              >
                {user?.name?.charAt(0) || "A"}
              </span>

              <button
                type="button"
                onClick={logout}
                aria-label="Sign Out"
                title="Sign Out"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 text-white/80 transition-colors hover:bg-red-500/20 hover:text-red-200 hover:border-red-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <LogoutIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 rounded-lg bg-white/5 p-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold">
                  {user?.name?.charAt(0) || "A"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate" title={user?.name}>
                    {user?.name}
                  </p>
                  <p className="text-[10px] text-white/60 truncate" title={user?.email}>
                    {user?.email}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-gold/20 px-2 py-0.5 text-[9px] font-bold text-gold uppercase tracking-wider">
                  {user?.role || "Admin"}
                </span>
              </div>

              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-red-500/20 hover:text-red-200 hover:border-red-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <LogoutIcon className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ======================================================================
          MOBILE SIDEBAR DRAWER & BACKDROP
         ====================================================================== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Darkened Backdrop (click to dismiss) */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Administrative navigation menu"
            className="relative flex w-72 flex-col bg-forest text-white h-full overflow-hidden shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <span className="text-[10px] font-semibold tracking-widest text-gold uppercase">
                  Admin Portal
                </span>
                <span className="block font-serif text-xl font-medium">Golden Resort</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                aria-label="Close navigation menu"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Vertically Scrollable Navigation */}
            <nav
              aria-label="Mobile Navigation"
              className="flex-1 min-h-0 overflow-y-auto py-4 px-3 space-y-4"
            >
              {ADMIN_NAV_SECTIONS.map((section) => {
                const visibleItems = section.items.filter(
                  (item) => !item.adminOnly || user?.role === "admin"
                );
                if (visibleItems.length === 0) return null;

                return (
                  <div key={section.title} className="space-y-1">
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-[10px] font-bold tracking-widest text-gold/80 uppercase">
                        {section.title}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const active = isRouteActive(pathname, item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition ${
                              active
                                ? "bg-gold text-forest-dark font-semibold shadow-xs"
                                : "text-white/80 hover:bg-forest-dark/70 hover:text-white"
                            }`}
                          >
                            <Icon className={`h-4 w-4 shrink-0 ${active ? "text-forest-dark" : "text-white/80"}`} />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            <div className="shrink-0 border-t border-white/10 p-4 bg-forest-dark/40 space-y-3">
              <div className="flex items-center gap-2.5 rounded-lg bg-white/5 p-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold">
                  {user?.name?.charAt(0) || "A"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">{user?.name}</p>
                  <p className="text-[10px] text-white/60 truncate">{user?.email}</p>
                </div>
                <span className="shrink-0 rounded-full bg-gold/20 px-2 py-0.5 text-[9px] font-bold text-gold uppercase tracking-wider">
                  {user?.role || "Admin"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-500/20 hover:text-red-200"
              >
                <LogoutIcon className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
