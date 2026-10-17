"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AdminAuthProvider, useAdminAuth } from "@/lib/admin-auth";
import {
  DashboardIcon,
  DoorIcon,
  CalendarIcon,
  SparklesIcon,
  KeyIcon,
  ClipboardListIcon,
  UserCheckIcon,
  CreditCardIcon,
  LogoutIcon,
  MenuIcon,
  CloseIcon,
} from "@/components/ui/Icons";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Client-side authentication guard: redirect to login if session is unauthenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/admin/login") {
      router.push("/admin/login");
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // If on login page, render children directly without dashboard shell
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const navLinks = [
    { label: "Dashboard & Analytics", href: "/admin", icon: DashboardIcon },
    { label: "Accommodations", href: "/admin/rooms", icon: DoorIcon },
    { label: "Availability Calendar", href: "/admin/calendar", icon: CalendarIcon },
    { label: "Housekeeping", href: "/admin/housekeeping", icon: SparklesIcon },
    { label: "Front Desk (Check-In)", href: "/admin/check-in-out", icon: KeyIcon },
    { label: "Reservations", href: "/admin/reservations", icon: ClipboardListIcon },
    { label: "Customers", href: "/admin/customers", icon: UserCheckIcon },
    { label: "Payments", href: "/admin/payments", icon: CreditCardIcon },
  ];

  return (
    <div className="flex h-screen h-dvh bg-slate-50 font-sans text-ink overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-forest/10 bg-forest text-white lg:flex h-full shrink-0">
        {/* Brand */}
        <div className="shrink-0 border-b border-white/10 p-6">
          <Link href="/admin" className="block">
            <span className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">
              Administrative Portal
            </span>
            <span className="block font-serif text-2xl font-medium tracking-wide">
              Golden Resort
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 p-4 text-sm overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-colors ${
                  isActive
                    ? "bg-gold text-forest-dark font-semibold shadow-sm"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="mb-3 rounded-lg bg-white/5 p-3">
            <p className="text-xs font-medium text-white truncate">{user?.name}</p>
            <p className="text-[0.7rem] text-gold/90 truncate">{user?.email}</p>
            <span className="mt-1.5 inline-block rounded-full bg-gold/20 px-2 py-0.5 text-[0.65rem] font-semibold text-gold uppercase">
              {user?.role}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-white/90 transition-colors hover:bg-red-500/20 hover:text-red-200"
          >
            <LogoutIcon className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex w-72 flex-col bg-forest p-6 text-white h-full overflow-hidden">
            <div className="shrink-0 flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-semibold tracking-wider text-gold uppercase">
                  Admin Portal
                </span>
                <span className="block font-serif text-xl">Golden Resort</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>

            <nav className="mt-6 flex-1 space-y-2 text-sm overflow-y-auto">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  link.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 font-medium ${
                      isActive
                        ? "bg-gold text-forest-dark font-semibold"
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={logout}
              className="shrink-0 mt-auto flex items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-xs font-medium text-white hover:bg-red-500/20"
            >
              <LogoutIcon className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="shrink-0 sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="text-forest lg:hidden"
              aria-label="Open navigation menu"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-forest sm:text-xl">
              Golden Resort Operations
            </h1>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center rounded-lg border border-forest/20 px-3 py-1.5 font-medium text-forest hover:bg-forest/5"
            >
              View Public Website &rarr;
            </Link>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest text-xs font-bold text-gold">
                {user?.name?.charAt(0) || "A"}
              </span>
              <span className="hidden md:inline font-medium text-forest">
                {user?.name}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-8">
          {!isAuthenticated && !isLoading ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-forest border-t-gold mb-3" />
              <p className="text-sm font-medium text-stone-600">
                Redirecting to Administrative Login...
              </p>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex min-h-[50vh] items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-forest border-t-gold" />
                </div>
              }
            >
              {children}
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <Suspense
        fallback={
          <div className="min-h-screen bg-ivory-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <AdminLayoutInner>{children}</AdminLayoutInner>
      </Suspense>
    </AdminAuthProvider>
  );
}
