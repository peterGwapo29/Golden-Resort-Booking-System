type SectionHeadingProps = {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
};

/** Eyebrow + serif heading + optional intro, shared across sections. */
export default function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "center",
  tone = "light",
}: SectionHeadingProps) {
  const isCenter = align === "center";
  const isDark = tone === "dark";

  return (
    <div className={isCenter ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <p className="text-xs font-medium tracking-[0.3em] text-gold uppercase">
        {eyebrow}
      </p>
      <h2
        id={id}
        className={`mt-4 font-serif text-4xl leading-tight font-medium sm:text-5xl ${
          isDark ? "text-white" : "text-forest"
        }`}
      >
        {title}
      </h2>
      <span
        aria-hidden="true"
        className={`mt-6 block h-px w-16 bg-gold ${isCenter ? "mx-auto" : ""}`}
      />
      {description ? (
        <p
          className={`mt-6 text-base leading-relaxed ${
            isDark ? "text-white/75" : "text-muted"
          }`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
