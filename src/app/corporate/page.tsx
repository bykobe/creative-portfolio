"use client";

// src/app/corporate/page.tsx
// The corporate one-pager, in a single file. It is a client component only because of the live
// clock; the page itself is still prerendered to static HTML. (A client page can't export
// `metadata`, so the tab title and description come from the root layout.)
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./corp.module.css";
import KobeCorp from "@/components/ui/svgs/KobeCorp";

// Whose time the clock shows. "Africa/Accra" = the same time for every visitor. Set it to
// undefined to show each visitor's own local time instead.
const TIME_ZONE: string | undefined = "Africa/Accra";

function formatTime(date: Date) {
  // "14:00": 24-hour, zero-padded
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TIME_ZONE,
  });
}

// The clock in the bottom-right corner: plain text, driven by Date, in your own font (see
// --pixel-font in corp.module.css). Until it mounts the text is invisible but takes its final
// space, so there is no layout shift and no hydration mismatch.
function Clock({ className }: { className?: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    let timer: number;

    // Update now, then again exactly when the next minute starts, so the display never lags
    const tick = () => {
      const now = new Date();
      setTime(formatTime(now));
      timer = window.setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()));
    };
    tick();

    // Browsers slow timers in background tabs: catch up the moment the tab is visible again
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

// An entry without an href is shown as plain text, not a dead link. Fill these in as you go.
type Item = { title: string; href?: string };

const WORK: Item[] = [
  { title: "JUICED", href: "/corporate/case-study/juiced" },
  { title: "Cresta", href: "/corporate/case-study/cresta" },
  { title: "PHILLY'S", href: "/corporate/case-study/phillys" },
  { title: "Stillz.co", href: "/corporate/case-study/stillz" },
  { title: "STAYR Inc.", href: "/corporate/case-study/stayr" },
];

const TOOLS: Item[] = [
  { title: "Next JS / React JS / Astro" },
  { title: "Typescript / Javascript" },
  { title: "Framer Motion / GSAP / R3F / WebGL / ThreeJS" },
  { title: "Figma / Paper / Jitter / Lottiefiles" },
  { title: "Git + GitHub / Vercel / Sanity / Contentful" },
];

const EXPERIENCE = [
  { company: "GCTU", role: "Software Intern" },
  { company: "STAYR Inc.", role: "Co-Founder + Frontend Lead" },
  { company: "ARCHIVE STUDIOS", role: "Founder + Design Engineer" },
  { company: "Upwork", role: "Freelance(Remote)" },
  { company: "GO2COD", role: "Frontend Internship(Remote)" },
];

const SOCIALS: Item[] = [
  { title: "Instagram" },
  { title: "X [Formally Twitter]" },
  { title: "Okay Dev" },
  { title: "LinkedIn" },
  { title: "hi@bykobe.dev", href: "mailto:hi@bykobe.dev" },
];

function LinkList({ items }: { items: Item[] }) {
  return (
    <ul className={styles.corp_list_items}>
      {items.map(({ title, href }) => (
        <li key={title}>
          {!href ? (
            <span>{title}</span>
          ) : href.startsWith("/") ? (
            // internal page (e.g. a case study): client-side navigation, no prefetch
            <Link href={href} prefetch={false}>
              {title}
            </Link>
          ) : (
            <a href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              {title}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function CorporatePage() {
  return (
    <main className={styles.corp_main}>
      {/* Background grid columns */}
      <div className={styles.corp_bg} aria-hidden="true">
        <div />
        <div />
        <div />
        <div />
      </div>

      <div className={styles.corp_headline}>
        <KobeCorp />
        <div className={styles.corp_subline}>
          <div className={styles.corp_subline_left}>
            <span className={styles.corp_subline_t1}>
              I am a self-taught multi-disciplinary creative based in <span className={styles.corp_muted}>Accra.</span>
              <br />
              Currently exploring the world of Three.JS and Shaders
            </span>
            {/* prefetch off: don't pull the heavy 3D route in while someone reads the resume */}
            <Link href="/" prefetch={false} className={styles.corp_subline_nav}>
              View Creative Version
            </Link>
          </div>
          <span className={`${styles.corp_subline_t1} ${styles.corp_subline_right}`}>
            <strong>Design Engineer</strong> / <span className={styles.corp_muted}>Working Remotely in the EU</span>
          </span>
        </div>
      </div>

      <div className={styles.corp_cs_wrapper}>
        <section className={styles.corp_cs_list}>
          <h2>My Work</h2>
          <LinkList items={WORK} />
        </section>

        <section className={styles.corp_cs_list}>
          <h2>Tools I use</h2>
          <LinkList items={TOOLS} />
        </section>

        <section className={styles.corp_cs_list}>
          <h2>Experience</h2>
          <ul className={styles.corp_list_items}>
            {EXPERIENCE.map(({ company, role }) => (
              <li key={company}>
                {company}/<span className={styles.corp_muted}>{role}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.corp_cs_list}>
          <h2>My Socials</h2>
          <LinkList items={SOCIALS} />
        </section>
      </div>

      {/* Current time, bottom-right, reading bottom to top */}
      <Clock className={styles.corp_clock} />
    </main>
  );
}
