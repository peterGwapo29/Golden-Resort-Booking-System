"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/admin-auth";
import AdminCustomerDetailPage from "@/app/admin/customers/[id]/page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function StaffCustomerDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAdminAuth();

  const isPermitted =
    user?.role === "admin" || user?.permissions?.includes("reservations.view");

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !isPermitted) {
      router.push("/staff");
    }
  }, [isLoading, isAuthenticated, user, isPermitted, router]);

  if (isLoading || !isPermitted) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-forest border-t-gold" />
      </div>
    );
  }

  return <AdminCustomerDetailPage params={params} />;
}
