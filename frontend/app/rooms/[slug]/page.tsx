import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RoomGallery from "@/components/rooms/RoomGallery";
import RoomDetailBookingBox from "@/components/rooms/RoomDetailBookingBox";
import { getRoomBySlug, sampleRooms } from "@/data/rooms";
import {
  ArrowLeftIcon,
  BedIcon,
  CheckIcon,
  UsersIcon,
} from "@/components/ui/Icons";

interface RoomDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return sampleRooms.map((room) => ({
    slug: room.slug,
  }));
}

export async function generateMetadata({
  params,
}: RoomDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const room = getRoomBySlug(slug);

  if (!room) {
    return {
      title: "Room Not Found | Golden Resort",
    };
  }

  return {
    title: `${room.name} | Golden Resort`,
    description: room.description,
  };
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const { slug } = await params;
  const room = getRoomBySlug(slug);

  if (!room) {
    notFound();
  }

  const categoryLabel: Record<string, string> = {
    room: "Garden Room",
    suite: "Family Suite",
    villa: "Pool Villa",
  };

  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 bg-ivory pt-24 pb-20 outline-none">
        {/* Breadcrumb Navigation */}
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted">
            <Link href="/" className="transition-colors hover:text-forest">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/rooms" className="transition-colors hover:text-forest">
              Rooms &amp; Suites
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-forest" aria-current="page">
              {room.name}
            </span>
          </nav>
        </div>

        {/* Content Layout */}
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
            {/* Left Column: Gallery, Specs & Descriptions */}
            <div className="space-y-10">
              {/* Photo Gallery */}
              <RoomGallery images={room.gallery} roomName={room.name} />

              {/* Title & Tagline */}
              <div>
                <span className="rounded-full bg-forest px-3.5 py-1 text-xs font-semibold tracking-wider text-gold uppercase">
                  {categoryLabel[room.category] || "Accommodation"}
                </span>
                <h1 className="mt-4 font-serif text-3xl font-medium text-forest sm:text-5xl">
                  {room.name}
                </h1>
                <p className="mt-2 text-base text-gold italic sm:text-lg">
                  {room.tagline}
                </p>
              </div>

              {/* Specifications Strip */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-forest/10 bg-white p-5 sm:grid-cols-4">
                <div>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <UsersIcon className="h-4 w-4 text-gold" />
                    Capacity
                  </span>
                  <p className="mt-1 text-sm font-semibold text-forest">
                    Up to {room.maxGuests} guests
                  </p>
                </div>

                <div>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <BedIcon className="h-4 w-4 text-gold" />
                    Bedding
                  </span>
                  <p className="mt-1 text-sm font-semibold text-forest">
                    {room.bedConfiguration}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-muted">Dimensions</span>
                  <p className="mt-1 text-sm font-semibold text-forest">
                    {room.sizeSqm} m² ({Math.round(room.sizeSqm * 10.764)} sq.ft)
                  </p>
                </div>

                <div>
                  <span className="text-xs text-muted">Surrounding View</span>
                  <p className="mt-1 text-sm font-semibold text-forest">
                    {room.view}
                  </p>
                </div>
              </div>

              {/* Long Editorial Description */}
              <div className="rounded-xl border border-forest/10 bg-white p-6 sm:p-8">
                <h2 className="font-serif text-2xl font-medium text-forest">
                  About this Sanctuary
                </h2>
                <div className="mt-4 space-y-4 text-base leading-relaxed text-muted">
                  {room.longDescription.map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>
              </div>

              {/* Amenities Checklist */}
              <div className="rounded-xl border border-forest/10 bg-white p-6 sm:p-8">
                <h2 className="font-serif text-2xl font-medium text-forest">
                  Included Amenities &amp; Services
                </h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {room.amenities.map((amenity) => (
                    <li key={amenity} className="flex items-center gap-3 text-sm text-ink/85">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
                        <CheckIcon className="h-4 w-4" />
                      </span>
                      <span>{amenity}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Return Link */}
              <div>
                <Link
                  href="/rooms"
                  className="inline-flex items-center gap-2 text-sm font-medium text-forest transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-gold"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Return to all accommodations
                </Link>
              </div>
            </div>

            {/* Right Column: Sticky Reservation Box */}
            <div>
              <Suspense
                fallback={
                  <div className="h-96 rounded-2xl border border-forest/10 bg-white p-6 shadow-xl animate-pulse" />
                }
              >
                <RoomDetailBookingBox room={room} />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
