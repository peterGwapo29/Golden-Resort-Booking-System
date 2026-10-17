"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AdminAuthProvider, useAdminAuth } from "@/lib/admin-auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { MenuIcon } from "@/components/ui/Icons";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAdminAuth();
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

  return (
    <div className="flex h-screen h-dvh bg-slate-50 font-sans text-ink overflow-hidden">
      {/* Desktop & Mobile Responsive Sidebar Component */}
      <AdminSidebar
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="shrink-0 sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="text-forest lg:hidden p-1.5 rounded-lg hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
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
              className="hidden sm:inline-flex items-center rounded-lg border border-forest/20 px-3 py-1.5 font-medium text-forest hover:bg-forest/5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
            >
              View Public Website &rarr;
            </Link>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest text-xs font-bold text-gold">
                {user?.name?.charAt(0) || "A"}
              </span>
              <span className="hidden md:inline font-medium text-forest truncate max-w-[150px]">
                {user?.name}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-8">
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
