"use client";

import { useState } from "react";
import Image from "next/image";
import type { ResortImage } from "@/data/resort";

interface RoomGalleryProps {
  images: ResortImage[];
  roomName: string;
}

export default function RoomGallery({ images, roomName }: RoomGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const fallbackSrc =
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80";
  const activeImage = images[activeIndex] || images[0];

  return (
    <div className="space-y-4">
      {/* Featured Primary Image */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-forest/10 shadow-md">
        <Image
          src={activeImage.src || fallbackSrc}
          alt={activeImage.alt || roomName}
          fill
          priority
          unoptimized
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            if (!target.dataset.failed) {
              target.dataset.failed = "true";
              target.src = fallbackSrc;
            }
          }}
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover transition-opacity duration-300"
        />
        <div className="absolute right-4 bottom-4 rounded-full bg-forest-dark/75 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
          {activeIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div
          className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5"
          role="region"
          aria-label={`${roomName} gallery thumbnails`}
        >
          {images.map((img, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={`${img.src}-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`View photo ${idx + 1} of ${roomName}`}
                aria-pressed={isActive}
                className={`relative aspect-[4/3] overflow-hidden rounded-lg transition-all focus-visible:outline-2 focus-visible:outline-gold ${
                  isActive
                    ? "ring-2 ring-gold ring-offset-2 ring-offset-ivory"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={img.src || fallbackSrc}
                  alt={img.alt || `${roomName} photo ${idx + 1}`}
                  fill
                  unoptimized
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (!target.dataset.failed) {
                      target.dataset.failed = "true";
                      target.src = fallbackSrc;
                    }
                  }}
                  sizes="120px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
