import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowLeftIcon } from "@/components/ui/Icons";

export default function RoomNotFound() {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex min-h-[70vh] flex-col items-center justify-center bg-ivory px-5 py-32 text-center sm:px-8">
        <div className="max-w-md">
          <p className="text-xs font-semibold tracking-widest text-gold uppercase">
            Error 404
          </p>
          <h1 className="mt-4 font-serif text-4xl font-medium text-forest sm:text-5xl">
            Accommodation Not Found
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            The room or suite you are searching for does not exist in our current
            accommodations catalog.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/rooms"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-forest-dark focus-visible:outline-2 focus-visible:outline-gold"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              View All Rooms
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-forest/30 bg-white px-6 py-3 text-sm font-medium text-forest transition-colors hover:bg-forest/5 focus-visible:outline-2 focus-visible:outline-gold"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
