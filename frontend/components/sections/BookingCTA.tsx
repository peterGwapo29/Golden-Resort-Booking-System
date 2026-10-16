import Image from "next/image";
import { bookingImage } from "@/data/resort";

/**
 * Booking call-to-action and the `#book` anchor target.
 * Online booking is intentionally not implemented in this phase; the button
 * jumps to the contact details until the Laravel booking flow exists.
 */
export default function BookingCTA() {
  return (
    <section
      id="book"
      aria-labelledby="book-heading"
      className="relative isolate overflow-hidden bg-forest-dark py-28 text-white sm:py-36"
    >
      <Image
        src={bookingImage.src}
        alt={bookingImage.alt}
        fill
        sizes="100vw"
        className="-z-20 object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-forest-dark/75"
      />

      <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <p className="text-xs font-medium tracking-[0.35em] text-gold uppercase">
          Reserve Your Escape
        </p>
        <h2
          id="book-heading"
          className="mt-5 font-serif text-4xl leading-tight font-medium sm:text-6xl"
        >
          Your Next Getaway Starts Here
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
          Trade busy days for slow mornings, warm sunshine and evenings under
          the stars. Your tropical retreat is waiting.
        </p>
        <a
          href="#contact"
          className="mt-10 inline-flex items-center justify-center rounded-full bg-gold px-10 py-4 text-sm font-medium tracking-wide text-forest-dark transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Book Your Stay
        </a>
        <p className="mt-5 text-xs text-white/60">
          Online booking is coming soon. Please reach out through the contact
          details below in the meantime.
        </p>
      </div>
    </section>
  );
}
