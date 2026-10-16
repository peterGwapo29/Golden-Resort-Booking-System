import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/sections/HeroSection";
import IntroductionSection from "@/components/sections/IntroductionSection";
import FeaturedRooms from "@/components/sections/FeaturedRooms";
import AmenitiesSection from "@/components/sections/AmenitiesSection";
import GallerySection from "@/components/sections/GallerySection";
import BookingCTA from "@/components/sections/BookingCTA";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <HeroSection />
        <IntroductionSection />
        <FeaturedRooms />
        <AmenitiesSection />
        <GallerySection />
        <BookingCTA />
      </main>
      <Footer />
    </>
  );
}
