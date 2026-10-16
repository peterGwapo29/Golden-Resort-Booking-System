import type { ComponentType, SVGProps } from "react";
import { amenities, type AmenityIcon } from "@/data/resort";
import SectionHeading from "@/components/ui/SectionHeading";
import {
  DiningIcon,
  FamilyIcon,
  LeafIcon,
  PoolIcon,
} from "@/components/ui/Icons";

const iconMap: Record<AmenityIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  pool: PoolIcon,
  dining: DiningIcon,
  garden: LeafIcon,
  family: FamilyIcon,
};

export default function AmenitiesSection() {
  return (
    <section
      id="amenities"
      aria-labelledby="amenities-heading"
      className="bg-forest py-24 text-white sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          id="amenities-heading"
          eyebrow="Resort Amenities"
          title="Everything You Need to Unwind"
          description="Simple comforts and natural surroundings, thoughtfully brought together for a restful stay."
          tone="dark"
        />

        <ul className="mt-16 grid gap-px overflow-hidden bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {amenities.map((amenity) => {
            const Icon = iconMap[amenity.icon];
            return (
              <li
                key={amenity.title}
                className="bg-forest p-8 transition-colors duration-300 hover:bg-forest-dark sm:p-10"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/50 text-gold">
                  <Icon className="h-7 w-7" />
                </span>
                <h3 className="mt-6 font-serif text-2xl font-medium">
                  {amenity.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  {amenity.description}
                </p>
              </li>
            );
          })}
        </ul>

        <p className="mt-10 text-center text-xs text-white/60">
          Amenities listed are sample content and may change.
        </p>
      </div>
    </section>
  );
}
