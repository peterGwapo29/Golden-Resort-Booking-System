import Image from "next/image";
import { introImage } from "@/data/resort";
import SectionHeading from "@/components/ui/SectionHeading";
import { ArrowRightIcon } from "@/components/ui/Icons";

export default function IntroductionSection() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="bg-ivory py-24 sm:py-32"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20">
        <div className="relative isolate mr-4 mb-4 lg:mr-6 lg:mb-6">
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm sm:aspect-[4/3] lg:aspect-[4/5]">
            <Image
              src={introImage.src}
              alt={introImage.alt}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          {/* Decorative offset frame for an editorial feel. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 translate-x-4 translate-y-4 border border-gold/60 lg:translate-x-6 lg:translate-y-6"
          />
        </div>

        <div>
          <SectionHeading
            id="about-heading"
            eyebrow="Your Tropical Hideaway"
            title="Where Relaxation Meets Nature"
            align="left"
          />
          <div className="mt-8 space-y-5 text-base leading-relaxed text-muted">
            <p>
              Tucked among lush greenery, Golden Resort is a calm retreat
              designed for unhurried days. Wake to birdsong, spend afternoons
              by the water, and end each evening with a gentle tropical breeze.
            </p>
            <p>
              Whether you are planning a quiet escape for two or a family
              holiday filled with shared moments, our team is here to make
              every stay feel effortless and warmly personal.
            </p>
          </div>
          <a
            href="#gallery"
            className="group mt-10 inline-flex items-center gap-3 rounded border-b border-gold pb-1 text-sm font-medium tracking-wide text-forest transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
          >
            Discover Our Story
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
