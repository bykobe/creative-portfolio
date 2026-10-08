"use client";

import { useEffect } from "react";

type ScrollBackgroundProps = {
  /** id of the element whose top edge triggers the change */
  targetId: string;
  /** fraction of the viewport height to trigger at (0-1) */
  at?: number;
};

export default function ScrollBackground({
  targetId,
  at = 0.8,
}: ScrollBackgroundProps) {
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    let frame = 0;
    let active = false;

    // Only touch the DOM when the state actually flips, so scrolling
    // between the two sides of the threshold costs nothing.
    const apply = (next: boolean) => {
      if (next === active) return;
      active = next;
      document.documentElement.dataset.bgActive = String(next);
    };

    const measure = () => {
      frame = 0;
      apply(target.getBoundingClientRect().top <= window.innerHeight * at);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      delete document.documentElement.dataset.bgActive;
    };
  }, [targetId, at]);

  return null;
}