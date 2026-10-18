"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getStaffProfile,
  updateStaffProfile,
  changeStaffPassword,
  type StaffProfile,
} from "@/lib/admin-api";
import { useAdminAuth } from "@/lib/admin-auth";
import {
  UserIcon,
  CheckIcon,
  InfoIcon,
  RefreshIcon,
  ChevronLeftIcon,
  KeyIcon,
  SparklesIcon,
} from "@/components/ui/Icons";

export default function StaffProfilePage() {
  const { user: authUser } = useAdminAuth();

  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Profile Edit Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const loadProfile = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await getStaffProfile();
      setProfile(res.user);
      setName(res.user.name);
      setPhone(res.user.phone || "");
    } catch (err: any) {
      setFetchError(err?.message || "Failed to load staff profile information.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    if (!name.trim()) {
      setProfileError("Full name is required.");
      setIsSavingProfile(false);
      return;
    }

    try {
      const res = await updateStaffProfile({
        name: name.trim(),
        phone: phone.trim() ? phone.trim() : null,
      });
      setProfile(res.user);
      setProfileSuccess("Your profile contact details have been updated successfully.");

      // Update cached localStorage user name
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("gr_admin_user");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            parsed.name = res.user.name;
            parsed.phone = res.user.phone;
            localStorage.setItem("gr_admin_user", JSON.stringify(parsed));
          } catch {
            // Ignore
          }
        }
      }
    } catch (err: any) {
      setProfileError(err?.message || "Failed to update profile details.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(false);
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await changeStaffPassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      setPasswordSuccess(res.message || "Password updated successfully. Other active sessions were signed out.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to change password. Please verify your current password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-44 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-96 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          <div className="h-96 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (fetchError || !profile) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center max-w-md mx-auto my-12">
        <InfoIcon className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-red-900">Profile Error</h2>
        <p className="mt-1 text-sm text-red-700">{fetchError || "Unable to retrieve your staff profile."}</p>
        <button
          type="button"
          onClick={loadProfile}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-forest-dark transition"
        >
          <RefreshIcon className="h-4 w-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Breadcrumb & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/staff"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-forest hover:text-gold transition-colors mb-2"
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
            <span>Back to Staff Dashboard</span>
          </Link>
          <h1 className="text-2xl font-serif font-bold text-forest">
            My Staff Profile &amp; Security
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Manage your personal contact details, review system permissions, and update your login password.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 text-xs font-semibold flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Active Account
          </span>
        </div>
      </div>

      {/* ======================================================================
          PROFILE OVERVIEW CARD
         ====================================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="h-20 w-20 rounded-full bg-forest text-gold text-2xl font-serif font-bold flex items-center justify-center shrink-0 shadow-md">
          {profile.name.charAt(0) || "S"}
        </div>

        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold text-forest truncate" title={profile.name}>
              {profile.name}
            </h2>
            <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-bold text-forest-dark uppercase tracking-wider">
              {profile.role}
            </span>
            {profile.department && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {profile.department}
              </span>
            )}
          </div>

          <p className="text-xs text-stone-600 font-mono">
            {profile.email}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted pt-1">
            <span>
              Phone: <strong className="text-stone-700">{profile.phone || "Not provided"}</strong>
            </span>
            <span>•</span>
            <span>
              Member since:{" "}
              <strong className="text-stone-700">
                {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "Active"}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ======================================================================
            FORM 1: EDIT CONTACT DETAILS
           ====================================================================== */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-semibold text-forest flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-gold" />
              <span>Contact Information</span>
            </h2>
            <p className="text-xs text-muted mt-1">
              Update your display name and contact phone number.
            </p>
          </div>

          {profileSuccess && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-900"
            >
              <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-900"
            >
              <InfoIcon className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label
                htmlFor="staff-name"
                className="block text-xs font-semibold tracking-wider text-forest uppercase"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="staff-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-ink placeholder-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                placeholder="e.g. Maria Santos"
              />
            </div>

            <div>
              <label
                htmlFor="staff-phone"
                className="block text-xs font-semibold tracking-wider text-forest uppercase"
              >
                Contact Phone
              </label>
              <input
                id="staff-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-ink placeholder-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                placeholder="+63 917 123 4567"
              />
              <p className="mt-1 text-[11px] text-muted">
                Used for operations communication and shift notices.
              </p>
            </div>

            <div>
              <label
                htmlFor="staff-email-readonly"
                className="block text-xs font-semibold tracking-wider text-stone-400 uppercase"
              >
                Email Address (System Login)
              </label>
              <input
                id="staff-email-readonly"
                type="email"
                disabled
                value={profile.email}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-stone-500 cursor-not-allowed"
              />
              <p className="mt-1 text-[11px] text-muted">
                Staff login emails are managed exclusively by administrators.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="flex items-center justify-center gap-2 rounded-xl bg-forest px-6 py-2.5 text-xs font-semibold text-white hover:bg-forest-dark transition disabled:opacity-50"
              >
                {isSavingProfile ? (
                  <span>Saving Changes...</span>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4 text-gold" />
                    <span>Save Contact Details</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ======================================================================
            FORM 2: CHANGE PASSWORD
           ====================================================================== */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-semibold text-forest flex items-center gap-2">
              <KeyIcon className="h-4 w-4 text-gold" />
              <span>Change Password</span>
            </h2>
            <p className="text-xs text-muted mt-1">
              Verify your current password to establish a new secure password.
            </p>
          </div>

          {passwordSuccess && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-900"
            >
              <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-900"
            >
              <InfoIcon className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="current-password"
                  className="block text-xs font-semibold tracking-wider text-forest uppercase"
                >
                  Current Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="text-[11px] text-muted hover:text-forest"
                >
                  {showCurrentPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-ink placeholder-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                placeholder="••••••••••••"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="new-password"
                  className="block text-xs font-semibold tracking-wider text-forest uppercase"
                >
                  New Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="text-[11px] text-muted hover:text-forest"
                >
                  {showNewPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-ink placeholder-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold tracking-wider text-forest uppercase"
              >
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <input
                id="confirm-password"
                type={showNewPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-ink placeholder-muted focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                placeholder="Re-enter new password"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="flex items-center justify-center gap-2 rounded-xl bg-forest px-6 py-2.5 text-xs font-semibold text-white hover:bg-forest-dark transition disabled:opacity-50"
              >
                {isChangingPassword ? (
                  <span>Updating Password...</span>
                ) : (
                  <>
                    <KeyIcon className="h-4 w-4 text-gold" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ======================================================================
          SECTION 3: SYSTEM PERMISSIONS & ROLE ASSIGNMENT
         ====================================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-semibold text-forest flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-gold" />
            <span>Assigned Role &amp; Capabilities</span>
          </h2>
          <p className="text-xs text-muted mt-1">
            System capabilities and permissions granted to this account based on your role (<strong className="capitalize">{profile.role}</strong>).
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {profile.permissions.map((perm) => (
            <span
              key={perm}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono text-stone-700"
            >
              {perm}
            </span>
          ))}
        </div>

        <div className="rounded-xl border border-forest/10 bg-forest/5 p-4 text-xs text-stone-700 leading-relaxed mt-4">
          Role promotions, department transfers, and administrative permission changes must be performed by an active system administrator.
        </div>
      </div>
    </div>
  );
}
