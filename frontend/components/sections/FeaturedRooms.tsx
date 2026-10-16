import Image from "next/image";
import Link from "next/link";
import { featuredRooms, formatPhp } from "@/data/resort";
import SectionHeading from "@/components/ui/SectionHeading";
import { ArrowRightIcon } from "@/components/ui/Icons";

export default function FeaturedRooms() {
  return (
    <section
      id="rooms"
      aria-labelledby="rooms-heading"
      className="bg-white py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          id="rooms-heading"
          eyebrow="Stay With Us"
          title="Rooms and Suites"
          description="Thoughtfully designed spaces for couples, families and anyone in need of a peaceful retreat."
        />

        <ul className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {featuredRooms.map((room) => (
            <li key={room.slug}>
              <article className="group flex h-full flex-col overflow-hidden bg-ivory shadow-sm transition-shadow duration-300 hover:shadow-xl">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={room.image.src}
                    alt={room.image.alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-7">
                  <p className="text-xs tracking-[0.2em] text-muted uppercase">
                    {room.guests}
                  </p>
                  <h3 className="mt-3 font-serif text-3xl font-medium text-forest">
                    {room.name}
                  </h3>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">
                    {room.description}
                  </p>
                  <div className="mt-6 flex items-end justify-between gap-4 border-t border-forest/10 pt-6">
                    <p className="text-sm text-muted">
                      From{" "}
                      <span className="font-serif text-2xl font-semibold text-forest">
                        {formatPhp(room.sampleRatePhp)}
                      </span>{" "}
                      / night
                      <span className="mt-1 block text-[0.7rem] tracking-wider text-gold uppercase">
                        Sample rate
                      </span>
                    </p>
                    <Link
                      href={room.href}
                      aria-label={`View details for ${room.name}`}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-forest px-5 py-2.5 text-sm font-medium text-forest transition-colors hover:bg-forest hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                    >
                      View Details
                      <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <div className="mt-12 text-center">
          <Link
            href="/rooms"
            className="inline-flex items-center gap-3 rounded-full bg-forest px-8 py-3.5 text-sm font-medium tracking-wide text-white transition-colors hover:bg-forest-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Explore All Rooms & Suites
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <p className="mt-10 text-center text-xs text-muted">
          Room types, descriptions and rates shown are sample content for
          demonstration and do not reflect actual availability or pricing.
        </p>
      </div>
    </section>
  );
}
