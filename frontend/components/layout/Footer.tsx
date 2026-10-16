import { Suspense } from "react";
import { navLinks, siteConfig } from "@/data/resort";
import CurrentYear from "@/components/layout/CurrentYear";

export default function Footer() {
  const { contact } = siteConfig;

  return (
    <footer
      id="contact"
      aria-labelledby="footer-heading"
      className="scroll-mt-20 bg-forest-dark text-white/75"
    >
      <h2 id="footer-heading" className="sr-only">
        Contact and site information
      </h2>

      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <a
            href="#home"
            className="inline-flex items-baseline gap-2 rounded text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
          >
            <span className="font-serif text-3xl font-semibold tracking-wide">
              Golden
            </span>
            <span className="text-xs font-medium tracking-[0.35em] text-gold uppercase">
              Resort
            </span>
          </a>
          <p className="mt-6 max-w-sm text-sm leading-relaxed">
            {siteConfig.description}
          </p>
        </div>

        <nav aria-label="Footer">
          <h3 className="text-xs font-medium tracking-[0.3em] text-gold uppercase">
            Explore
          </h3>
          <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="text-xs font-medium tracking-[0.3em] text-gold uppercase">
            Contact
          </h3>
          {/* Placeholder details: replace with confirmed resort information. */}
          <address className="mt-6 space-y-3 text-sm not-italic">
            <p>{contact.address}</p>
            <p>{contact.phone}</p>
            <p>{contact.email}</p>
          </address>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            &copy;{" "}
            <Suspense fallback={null}>
              <CurrentYear />
            </Suspense>{" "}
            {siteConfig.name}. All rights reserved.
          </p>
          <p>Photography via Unsplash. Content shown is sample content.</p>
        </div>
      </div>
    </footer>
  );
}
