import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RoomsCatalog from "@/components/rooms/RoomsCatalog";

export const metadata: Metadata = {
  title: "Rooms & Suites | Golden Resort",
  description:
    "Explore our collection of luxurious garden rooms, family suites, and private pool villas at Golden Resort.",
};

export default function RoomsPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 bg-ivory outline-none">
        {/* Page Hero Header */}
        <div className="relative isolate overflow-hidden bg-forest-dark px-5 pt-36 pb-28 text-white sm:px-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-forest/60 via-forest-dark to-forest-dark"
          />
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-medium tracking-[0.35em] text-gold uppercase sm:text-sm">
              Accommodations
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-tight font-medium sm:text-6xl">
              Rooms, Suites &amp; Villas
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
              Each space is thoughtfully crafted for unhurried comfort, pairing
              natural organic textures with tranquil tropical garden and pool
              views.
            </p>
          </div>
        </div>

        {/* Catalog Wrapped in Suspense for Search Param Hydration */}
        <section className="pb-24">
          <Suspense
            fallback={
              <div className="mx-auto max-w-7xl px-5 py-20 text-center text-sm text-muted sm:px-8">
                Loading accommodations...
              </div>
            }
          >
            <RoomsCatalog />
          </Suspense>
        </section>
      </main>
      <Footer />
    </>
  );
}
