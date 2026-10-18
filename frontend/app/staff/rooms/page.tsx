"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/admin-auth";
import AdminRoomsPage from "@/app/admin/rooms/page";

export default function StaffRoomsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAdminAuth();

  const isPermitted =
    user?.role === "admin" ||
    user?.role === "manager" ||
    (user?.role === "front_desk" && user?.permissions?.includes("rooms.view"));

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

  return <AdminRoomsPage />;
}
