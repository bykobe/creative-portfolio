"use client";

// src/components/ui/ClipText.tsx
// Text that is revealed line by line: every line is clipped by its own mask and slides up into it.
//
//   <ClipText as="h2" on="scroll">Selected work</ClipText>            plays when it scrolls into view
//   <ClipText as="p"  on="load" delay={0.3}>Art direction…</ClipText>  plays on page load (the hero)
//
// "load" inside the landing page waits for the 3D hand-off to finish, then plays (and plays again
// every time the page is entered). Outside the landing page it plays as soon as the fonts are ready.
// Needs gsap 3.13+ (SplitText is part of the free package): npm i gsap@latest

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { landingGate } from "@/providers/landing-gate";
import styles from "./ui.module.css";

gsap.registerPlugin(ScrollTrigger, SplitText);

type ClipTextProps = {
  children: ReactNode;
  /** The element to render: "h1", "h2", "p", "span"... */
  as?: ElementType;
  className?: string;
  /** "scroll": play once when it enters the screen. "load": play on page load. */
  on?: "scroll" | "load";
  /** seconds before it starts ("load") or after it enters ("scroll") */
  delay?: number;
  duration?: number;
  /** seconds between one line starting and the next */
  stagger?: number;
  ease?: string;
  /** ScrollTrigger start for on="scroll": when the top of the text reaches this much of the screen */
  start?: string;
};

export default function ClipText({
  children,
  as: Tag = "p",
  className,
  on = "scroll",
  delay = 0,
  duration = 1,
  stagger = 0.1,
  ease = "expo.out",
  start = "top 88%",
}: ClipTextProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.visibility = "visible";
      return;
    }

    let split: SplitText | null = null;
    let stopWaiting = () => {};
    let cancelled = false;

    // Split into lines (each in its own mask) and build the animation. With autoSplit the lines are
    // re-measured when the window or the fonts change, and the animation carries on where it was.
    const setup = (playOnLoad: boolean) => {
      split?.revert();
      split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        onSplit: (self) => {
          // room for descenders (g, y, p) inside the mask, without changing the layout
          self.masks.forEach((m) => {
            (m as HTMLElement).style.paddingBottom = "0.14em";
            (m as HTMLElement).style.marginBottom = "-0.14em";
          });
          const tween = gsap.from(self.lines, {
            yPercent: 115,
            duration,
            ease,
            stagger,
            delay: playOnLoad ? delay : 0,
            ...(playOnLoad
              ? {}
              : { scrollTrigger: { trigger: el, start, once: true }, delay }),
          });
          el.style.visibility = "visible"; // the lines are already clipped away: safe to show
          return tween;
        },
      });
    };

    // When the element can be measured: straight away, unless it lives inside the landing page,
    // which is display:none until the 3D scene has handed off to it.
    const insideGate = !!el.closest("[data-landing-gate]");
    const ready = () => landingGate.phase === "page" && !landingGate.busy;

    const begin = async () => {
      await document.fonts.ready; // measure the lines in the real font
      if (cancelled) return;

      if (!insideGate) {
        setup(on === "load");
        return;
      }

      // inside the landing page: wait for the reveal
      const go = () => {
        if (cancelled) return;
        setup(on === "load");
        if (on === "scroll") ScrollTrigger.refresh(); // the page just got its height
      };
      if (ready()) return go();

      let done = false;
      const off = landingGate.on((e) => {
        if (e.direction !== "enter") return;
        const revealed = e.type === "finish" || (e.type === "commit" && !landingGate.busy);
        if (!revealed) return;
        if (on === "scroll") {
          if (done) return;
          done = true;
          off();
          go();
        } else {
          go(); // "load": play again every time the page is entered
        }
      });
      stopWaiting = off;
    };

    void begin();

    return () => {
      cancelled = true;
      stopWaiting();
      split?.revert();
    };
    // the animation settings are read once, when the text first appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Tag ref={ref} className={`${styles.clip} ${className ?? ""}`}>
      {children}
    </Tag>
  );
}
