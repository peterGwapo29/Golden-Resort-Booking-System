import Image from "next/image";
import { heroImage, siteConfig } from "@/data/resort";

export default function HeroSection() {
  return (
    <section
      id="home"
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-forest-dark text-white"
    >
      <Image
        src={heroImage.src}
        alt={heroImage.alt}
        fill
        preload
        sizes="100vw"
        className="-z-20 object-cover object-[center_60%]"
      />
      {/* Dark gradient overlay keeps text readable over any part of the photo. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-forest-dark/70 via-forest-dark/45 to-forest-dark/80"
      />

      <div className="mx-auto w-full max-w-7xl px-5 pt-28 pb-20 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-medium tracking-[0.35em] text-gold uppercase sm:text-sm">
            Welcome to {siteConfig.name}
          </p>
          <h1
            id="hero-heading"
            className="mt-5 font-serif text-[clamp(2.75rem,8vw,6rem)] leading-[1.02] font-medium"
          >
            Your Escape to <em className="font-normal text-gold">Paradise</em>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
            Slow down among swaying palms, tranquil pools and gardens in full
            bloom. A peaceful getaway where every day moves at the pace of the
            tropics.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="#about"
              className="inline-flex items-center justify-center rounded-full border border-white/70 px-8 py-3.5 text-sm font-medium tracking-wide transition-colors hover:border-white hover:bg-white hover:text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Explore Our Resort
            </a>
            <a
              href={siteConfig.bookingHref}
              className="inline-flex items-center justify-center rounded-full bg-gold px-8 py-3.5 text-sm font-medium tracking-wide text-forest-dark transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Book Your Stay
            </a>
          </div>
        </div>
      </div>

      <a
        href="#about"
        aria-label="Scroll to introduction"
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.65rem] tracking-[0.3em] text-white/70 uppercase transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-gold sm:flex"
      >
        Scroll
        <span aria-hidden="true" className="block h-10 w-px bg-white/50" />
      </a>
    </section>
  );
}
