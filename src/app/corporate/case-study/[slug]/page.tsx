"use client";

// src/app/corporate/case-study/[slug]/page.tsx
// One case study, in a single file (plus case.module.css). To add or edit a project, change the
// STUDIES array below; the sidebar, the page and the URLs all come from it.
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound, useParams } from "next/navigation";
import styles from "./slug.module.css";
import { Lenis } from "lenis/react";

/* ------------------------------------------------------------------ data */

// A paragraph is a list of parts: plain strings, or { text, href } for an inline link.
type Part = string | { text: string; href: string };

type Study = {
  slug: string;
  title: string;
  /** Hero image, relative to /public. Shown at roughly 1.68 : 1. */
  image: string;
  imageAlt: string;
  inspiration: Part[][];
  process: Part[][];
  credits: { label: string; value: string }[];
};

const COMING_SOON: Part[][] = [[ "Case study coming soon." ]]; // placeholder until you write it

const STUDIES: Study[] = [
  {
    slug: "juiced",
    title: "JUICED",
    image: "/images/juiced-branding1.jpg",
    imageAlt: "JUICED paper bag mock-up with four colourful bottle shapes",
    inspiration: [
      [
        "I was inspired by leading creative agencies like Puree Maison, who use bold typography and loud and vibrant colors to express an idea and invoke feeling.",
      ],
      [
        "It co-relates to how I came about this portfolio because I drew a lot of inspiration from their ",
        { text: "PimPan Case Study", href: "https://pureemaison.com/cas-clients/pimpan-branding/" }, // TODO: real link
        " with regards to the art direction I decided to flow with.",
      ],
      [
        "That coupled with some creative magazines, and of-course Cartoons I watched as a kid helped inspire the branding process and Art Direction",
      ],
    ],
    process: [
      [
        "Moodboarding: During this phase I collected a lot of imagery, illustrations, and browsed through countless font libraries to create the perfect moodboard for the client.",
      ],
      [
        "Brand Identity: After gathering the moodboard and creating a new visual direction for this local juice brand. I had to convert them from your typical juice brand with no specific direction and a general vibe to it into a fully realized brand with real world mock-ups showcasing their Identity.",
      ],
    ],
    credits: [
      { label: "Studio", value: "ARCHIVE STUDIOS" },
      { label: "Creative Lead", value: "Kobe Tio" },
      { label: "Client", value: "JUICED" },
    ],
  },
  // The rest are placeholders: fill in the text, credits and image the same way as JUICED.
  ...[
    { slug: "cresta", title: "Cresta",image: "/images/cresta1.webp", client: "Cresta" },
    { slug: "phillys", title: "PHILLY'S", client: "PHILLY'S" },
    { slug: "stillz", title: "Stillz.co", client: "Stillz.co" },
    { slug: "stayr", title: "STAYR Inc.", client: "STAYR Inc." },
  ].map(
    ({ slug, title, client }): Study => ({
      slug,
      title,
      image: `/case-studies/${slug}/hero.jpg`,
      imageAlt: `${title} case study`,
      inspiration: COMING_SOON,
      process: COMING_SOON,
      credits: [
        { label: "Studio", value: "ARCHIVE STUDIOS" },
        { label: "Creative Lead", value: "Kobe Tio" },
        { label: "Clients", value: client },
      ],
    }),
  ),
];

/* ----------------------------------------------------------------- clock */

// Whose time the clock shows. "Africa/Accra" = the same for every visitor; undefined = each
// visitor's own local time. Same clock as the corporate page.
const TIME_ZONE: string | undefined = "Africa/Accra";

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TIME_ZONE,
  });
}

function Clock({ className }: { className?: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    let timer: number;
    const tick = () => {
      const now = new Date();
      setTime(formatTime(now));
      timer = window.setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()));
    };
    tick();

    const resync = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(timer);
      tick();
    };
    document.addEventListener("visibilitychange", resync);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", resync);
    };
  }, []);

  return (
    <time className={className} aria-hidden="true" style={{ visibility: time ? "visible" : "hidden" }}>
      {time ?? "00:00"}
    </time>
  );
}

/* ------------------------------------------------------------------ page */

const hrefFor = (slug: string) => `/corporate/case-study/${slug}`;

function Paragraphs({ paragraphs }: { paragraphs: Part[][] }): ReactNode {
  return paragraphs.map((parts, i) => (
    <p key={i}>
      {parts.map((part, j) =>
        typeof part === "string" ? (
          part
        ) : (
          <a key={j} href={part.href} target="_blank" rel="noreferrer">
            {part.text}
          </a>
        ),
      )}
    </p>
  ));
}

export default function CaseStudyPage() {
  const { slug } = useParams<{ slug: string }>();
  const study = STUDIES.find((s) => s.slug === slug);
  if (!study) notFound();

  return (
      <main className={styles.case_main}>
      {/* the four vertical grid lines, drawn over everything (they cross the image too) */}
      <div className={styles.case_bg} aria-hidden="true">
        <div />
        <div />
        <div />
        <div />
      </div>

      <aside className={styles.case_side}>
        <nav aria-label="Case studies">
          <h2 className={styles.case_side_title}>Other Case Studies</h2>
          <ul className={styles.case_side_list}>
            {STUDIES.map((s) => (
              <li key={s.slug}>
                <Link
                  href={hrefFor(s.slug)}
                  prefetch={false}
                  aria-current={s.slug === study.slug ? "page" : undefined}
                  className={s.slug === study.slug ? styles.case_active : undefined}
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <h1 className={styles.case_name}>{study.title}</h1>
      </aside>

      <div className={styles.case_content}>
        <div className={styles.case_hero}>
          <Image
            src={study.image}
            alt={study.imageAlt}
            fill
            priority
            sizes="(max-width: 900px) 100vw, 75vw"
            className={styles.case_hero_img}
          />
        </div>

        <div className={styles.case_sections}>
          <section className={styles.case_section}>
            <h2>Inspiration</h2>
            <div className={styles.case_body}>
              <Paragraphs paragraphs={study.inspiration} />
            </div>
          </section>

          <section className={styles.case_section}>
            <h2>Process</h2>
            <div className={styles.case_body}>
              <Paragraphs paragraphs={study.process} />
            </div>
          </section>

          <section className={styles.case_section}>
            <h2>Credits</h2>
            <ul className={styles.case_credits}>
              {study.credits.map((c) => (
                <li key={c.label}>
                  {c.label}/<span>{c.value}</span>
                </li>
              ))}
            </ul>
            <Link href="/corporate" prefetch={false} className={styles.case_back}>
              ← Go back
            </Link>
          </section>
        </div>
      </div>

      <Clock className={styles.case_clock} />
      </main>
  );
}
