"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { navLinks, siteConfig } from "@/data/resort";
import { CloseIcon, MenuIcon } from "@/components/ui/Icons";

const SCROLL_THRESHOLD = 24;

function subscribeToScroll(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}

const getScrolled = () => window.scrollY > SCROLL_THRESHOLD;
/** Server render always assumes the top of the page (transparent header). */
const getServerScrolled = () => false;

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useSyncExternalStore(
    subscribeToScroll,
    getScrolled,
    getServerScrolled,
  );
  const menuId = useId();
  const solid = scrolled || menuOpen;

  // While the mobile menu is open: lock page scroll, close on Escape,
  // and close automatically if the viewport grows to the desktop layout.
  useEffect(() => {
    if (!menuOpen) return;

    const desktop = window.matchMedia("(min-width: 1024px)");
    const close = () => setMenuOpen(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onBreakpoint = (event: MediaQueryListEvent) => {
      if (event.matches) close();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpoint);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        solid
          ? "bg-ivory/95 text-forest shadow-sm backdrop-blur"
          : "bg-transparent text-white"
      }`}
    >
      <a
        href="#main-content"
        className="sr-only rounded bg-gold px-4 py-2 text-forest-dark focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <a
          href="#home"
          onClick={closeMenu}
          className="group flex items-baseline gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
        >
          <span className="font-serif text-2xl font-semibold tracking-wide sm:text-[1.7rem]">
            Golden
          </span>
          <span className="text-[0.7rem] font-medium tracking-[0.35em] text-gold uppercase">
            Resort
          </span>
        </a>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="relative rounded py-1 text-sm tracking-wide transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-gold after:transition-transform hover:text-gold hover:after:scale-x-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={siteConfig.bookingHref}
            className="hidden rounded-full bg-gold px-6 py-2.5 text-sm font-medium tracking-wide text-forest-dark transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:inline-block"
          >
            Book Your Stay
          </a>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold lg:hidden"
          >
            {menuOpen ? (
              <CloseIcon className="h-6 w-6" />
            ) : (
              <MenuIcon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      <nav
        id={menuId}
        aria-label="Mobile"
        hidden={!menuOpen}
        className="h-[calc(100svh-5rem)] overflow-y-auto border-t border-forest/10 bg-ivory lg:hidden"
      >
        <ul className="flex flex-col px-5 py-6 sm:px-8">
          {navLinks.map((link) => (
            <li key={link.href} className="border-b border-forest/10">
              <a
                href={link.href}
                onClick={closeMenu}
                className="block py-4 font-serif text-2xl text-forest transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-gold"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="px-5 pb-10 sm:px-8">
          <a
            href={siteConfig.bookingHref}
            onClick={closeMenu}
            className="block rounded-full bg-forest px-6 py-4 text-center text-sm font-medium tracking-wide text-white transition-colors hover:bg-forest-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Book Your Stay
          </a>
        </div>
      </nav>
    </header>
  );
}
