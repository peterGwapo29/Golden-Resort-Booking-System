import Image from "next/image";
import { galleryImages, type GalleryImage } from "@/data/resort";
import SectionHeading from "@/components/ui/SectionHeading";

const spanClasses: Record<GalleryImage["span"], string> = {
  tall: "row-span-2",
  wide: "col-span-2",
  regular: "",
};

const spanSizes: Record<GalleryImage["span"], string> = {
  tall: "(min-width: 1024px) 25vw, 50vw",
  wide: "(min-width: 1024px) 50vw, 100vw",
  regular: "(min-width: 1024px) 25vw, 50vw",
};

export default function GallerySection() {
  return (
    <section
      id="gallery"
      aria-labelledby="gallery-heading"
      className="bg-ivory py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          id="gallery-heading"
          eyebrow="Gallery"
          title="Moments in Paradise"
          description="A glimpse of the calm, color and natural beauty that await you."
        />

        {/* Dense flow lets regular tiles fill gaps around tall and wide tiles. */}
        <ul className="mt-16 grid auto-rows-[160px] grid-flow-dense grid-cols-2 gap-3 sm:auto-rows-[220px] sm:gap-4 lg:auto-rows-[250px] lg:grid-cols-4">
          {galleryImages.map((image) => (
            <li
              key={image.src}
              className={`group relative overflow-hidden rounded-sm bg-forest/10 ${spanClasses[image.span]}`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes={spanSizes[image.span]}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-forest-dark/0 transition-colors duration-500 group-hover:bg-forest-dark/20"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
