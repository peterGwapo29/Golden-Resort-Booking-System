import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BookingFlow from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "Reserve Your Stay | Golden Resort",
  description:
    "Review sample room rates, specify your stay dates, and prepare your reservation with Golden Resort.",
};

export default function BookingPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 bg-ivory pb-24 outline-none">
        {/* Banner */}
        <div className="relative isolate overflow-hidden bg-forest-dark px-5 pt-36 pb-20 text-white sm:px-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-forest/60 via-forest-dark to-forest-dark"
          />
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-medium tracking-[0.35em] text-gold uppercase sm:text-sm">
              Reservation Preview
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-tight font-medium sm:text-5xl">
              Plan Your Tropical Escape
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              Customize your stay schedule, select your ideal room or suite, and
              preview your reservation details.
            </p>
          </div>
        </div>

        {/* Booking Workflow Section */}
        <div className="mt-12">
          <Suspense
            fallback={
              <div className="mx-auto max-w-7xl px-5 py-20 text-center text-sm text-muted sm:px-8">
                Loading reservation interface...
              </div>
            }
          >
            <BookingFlow />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
