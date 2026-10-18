"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/admin-auth";
import { ApiError } from "@/lib/api";
import { InfoIcon, ArrowRightIcon } from "@/components/ui/Icons";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdminAuth();

  const [email, setEmail] = useState("admin@goldenresort.com");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const authenticatedUser = await login(email, password);
      if (authenticatedUser && authenticatedUser.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/staff");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError("Too many login attempts. Please wait a minute before retrying.");
        } else {
          setError(err.message || "Invalid email or password.");
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected authentication error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-5 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center">
          <span className="text-xs font-semibold tracking-[0.3em] text-gold uppercase">
            Administrative Portal
          </span>
          <h1 className="mt-2 font-serif text-3xl font-medium text-forest sm:text-4xl">
            Golden Resort
          </h1>
          <p className="mt-2 text-xs text-muted">
            Authorized resort staff &amp; management personnel only.
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 rounded-2xl border border-forest/10 bg-white p-8 shadow-xl">
          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-900"
            >
              <InfoIcon className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <strong className="block font-semibold">Authentication Failed</strong>
                <p className="mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold tracking-wider text-forest uppercase"
              >
                Staff Email Address
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-forest/20 bg-ivory/40 px-4 py-3 text-sm text-ink placeholder-muted transition-colors focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold"
                placeholder="staff@goldenresort.com"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold tracking-wider text-forest uppercase"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-forest/20 bg-ivory/40 px-4 py-3 text-sm text-ink placeholder-muted transition-colors focus:border-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-forest px-6 py-3.5 text-sm font-medium tracking-wide text-white transition-colors hover:bg-forest-dark focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  Access Admin Dashboard
                  <ArrowRightIcon className="h-4 w-4 text-gold" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-forest/10 pt-4 text-center">
            <Link
              href="/"
              className="text-xs text-muted hover:text-forest transition-colors"
            >
              &larr; Return to Guest Website
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
