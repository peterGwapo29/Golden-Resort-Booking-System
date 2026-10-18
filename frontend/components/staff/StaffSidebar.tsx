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
  UserIcon,
  LogoutIcon,
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  WrenchIcon,
} from "@/components/ui/Icons";

export interface StaffNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermission?: string;
  allowedRoles?: string[];
}

export interface StaffNavSection {
  title: string;
  items: StaffNavItem[];
}

export const STAFF_NAV_SECTIONS: StaffNavSection[] = [
  {
    title: "Staff Workstation",
    items: [
      { label: "My Dashboard", href: "/staff", icon: DashboardIcon },
      { label: "Profile & Security", href: "/staff/profile", icon: UserIcon },
    ],
  },
  {
    title: "Permitted Operations",
    items: [
      {
        label: "Housekeeping",
        href: "/staff/housekeeping",
        icon: SparklesIcon,
        requiredPermission: "housekeeping.manage",
        allowedRoles: ["admin", "manager", "housekeeper"],
      },
      {
        label: "Maintenance",
        href: "/staff/maintenance",
        icon: WrenchIcon,
        requiredPermission: "maintenance.view",
        allowedRoles: ["admin", "manager", "maintenance"],
      },
      {
        label: "Front Desk (Check-In)",
        href: "/staff/check-in-out",
        icon: KeyIcon,
        requiredPermission: "checkin.manage",
        allowedRoles: ["admin", "manager", "front_desk"],
      },
      {
        label: "Availability Calendar",
        href: "/staff/calendar",
        icon: CalendarIcon,
        requiredPermission: "rooms.view",
        allowedRoles: ["admin", "manager", "front_desk"],
      },
      {
        label: "Accommodations",
        href: "/staff/rooms",
        icon: DoorIcon,
        requiredPermission: "rooms.view",
        allowedRoles: ["admin", "manager", "front_desk"],
      },
      {
        label: "Reservations",
        href: "/staff/reservations",
        icon: ClipboardListIcon,
        requiredPermission: "reservations.view",
        allowedRoles: ["admin", "manager", "front_desk"],
      },
      {
        label: "Customers",
        href: "/staff/customers",
        icon: UserCheckIcon,
        requiredPermission: "reservations.view",
        allowedRoles: ["admin", "manager", "front_desk"],
      },
    ],
  },
];

export function isStaffRouteActive(currentPath: string, linkHref: string): boolean {
  if (linkHref === "/staff") {
    return currentPath === "/staff";
  }
  return currentPath === linkHref || currentPath.startsWith(`${linkHref}/`);
}

interface StaffSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function StaffSidebar({
  mobileOpen,
  setMobileOpen,
}: StaffSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAdminAuth();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("gr_staff_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // Ignore localStorage issues
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem("gr_staff_sidebar_collapsed", String(next));
    } catch {
      // Ignore localStorage issues
    }
  };

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

  const collapsed = mounted ? isCollapsed : false;
  const userPermissions = user?.permissions || [];
  const isAdmin = user?.role === "admin";

  const hasAccess = (item: StaffNavItem) => {
    if (isAdmin) return true;
    const userRole = user?.role || "staff";

    // 1. Enforce strict role matching if configured
    if (item.allowedRoles && !item.allowedRoles.includes(userRole)) {
      return false;
    }

    // 2. Enforce permission verification
    if (!item.requiredPermission) return true;
    return userPermissions.includes(item.requiredPermission);
  };

  return (
    <>
      {/* ======================================================================
          DESKTOP SIDEBAR
         ====================================================================== */}
      <aside
        aria-label="Staff Navigation"
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
            href="/staff"
            className="group flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-lg p-0.5"
            title="Golden Resort Staff Portal"
          >
            {collapsed ? (
              <span className="font-serif text-2xl font-bold tracking-wider text-gold group-hover:text-white transition-colors">
                GR
              </span>
            ) : (
              <div>
                <span className="block text-[10px] font-semibold tracking-[0.25em] text-gold uppercase">
                  Staff Workstation
                </span>
                <span className="block font-serif text-xl font-medium tracking-wide text-white group-hover:text-gold transition-colors">
                  Golden Resort
                </span>
              </div>
            )}
          </Link>

          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              aria-expanded="true"
              className="rounded-lg p-1.5 text-white/70 hover:bg-forest-dark/70 hover:text-gold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              title="Collapse sidebar"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          )}
        </div>

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

        {/* Primary Navigation */}
        <nav
          aria-label="Staff Navigation Menu"
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4 [scrollbar-width:thin] [scrollbar-color:rgba(198,166,107,0.3)_transparent]"
        >
          {STAFF_NAV_SECTIONS.map((section, sIdx) => {
            const visibleItems = section.items.filter(hasAccess);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                {collapsed ? (
                  sIdx > 0 && (
                    <div
                      role="separator"
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

                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = isStaffRouteActive(pathname, item.href);

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

          {/* Switch to Admin Portal Shortcut (if Admin) */}
          {isAdmin && (
            <div className="pt-2">
              {!collapsed && (
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-bold tracking-widest text-gold/80 uppercase select-none">
                    Administration
                  </span>
                </div>
              )}
              <Link
                href="/admin"
                title={collapsed ? "Switch to Admin Portal" : undefined}
                className={`flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/10 text-gold transition-colors hover:bg-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                  collapsed ? "justify-center px-2 py-2.5" : "px-3.5 py-2 text-xs font-semibold"
                }`}
              >
                <DashboardIcon className="h-4 w-4 shrink-0 text-gold" />
                {!collapsed && <span>Switch to Admin Portal &rarr;</span>}
              </Link>
            </div>
          )}
        </nav>

        {/* User Footer */}
        <div className="shrink-0 border-t border-white/10 p-3 bg-forest-dark/40">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold"
                title={`${user?.name || "Staff"} (${user?.role || "Staff"})`}
              >
                {user?.name?.charAt(0) || "S"}
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
              <Link
                href="/staff/profile"
                className="group flex items-center gap-2.5 rounded-lg bg-white/5 p-2.5 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                title="View your staff profile"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold group-hover:scale-105 transition-transform">
                  {user?.name?.charAt(0) || "S"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate" title={user?.name}>
                    {user?.name}
                  </p>
                  <p className="text-[10px] text-white/60 truncate" title={user?.department || user?.email}>
                    {user?.department || user?.email}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-gold/20 px-2 py-0.5 text-[9px] font-bold text-gold uppercase tracking-wider">
                  {user?.role || "Staff"}
                </span>
              </Link>

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
          MOBILE SIDEBAR DRAWER
         ====================================================================== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Staff navigation menu"
            className="relative flex w-72 flex-col bg-forest text-white h-full overflow-hidden shadow-2xl"
          >
            <div className="shrink-0 flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <span className="text-[10px] font-semibold tracking-widest text-gold uppercase">
                  Staff Portal
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

            <nav
              aria-label="Mobile Staff Navigation"
              className="flex-1 min-h-0 overflow-y-auto py-4 px-3 space-y-4"
            >
              {STAFF_NAV_SECTIONS.map((section) => {
                const visibleItems = section.items.filter(hasAccess);
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
                        const active = isStaffRouteActive(pathname, item.href);

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

              {isAdmin && (
                <div className="pt-2">
                  <div className="px-3 pt-2 pb-1">
                    <span className="text-[10px] font-bold tracking-widest text-gold/80 uppercase">
                      Administration
                    </span>
                  </div>
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/10 px-3.5 py-2.5 text-xs font-semibold text-gold transition hover:bg-gold/20"
                  >
                    <DashboardIcon className="h-4 w-4 shrink-0 text-gold" />
                    <span>Switch to Admin Portal &rarr;</span>
                  </Link>
                </div>
              )}
            </nav>

            <div className="shrink-0 border-t border-white/10 p-4 bg-forest-dark/40 space-y-3">
              <Link
                href="/staff/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 rounded-lg bg-white/5 p-2.5 transition hover:bg-white/10"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold">
                  {user?.name?.charAt(0) || "S"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">{user?.name}</p>
                  <p className="text-[10px] text-white/60 truncate">{user?.department || user?.email}</p>
                </div>
                <span className="shrink-0 rounded-full bg-gold/20 px-2 py-0.5 text-[9px] font-bold text-gold uppercase tracking-wider">
                  {user?.role || "Staff"}
                </span>
              </Link>

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
