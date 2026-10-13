"use client";
// src/components/HeroTransition.tsx
//
// PLACEHOLDER transition between the 3D scene and the landing page: a box that scales from 0% to
// 100% of the viewport, then wipes away upwards. Replace the two animations below with your own.
//
// The contract (landing-gate.ts) is all it has to honour:
//   1. when the gate says "begin", cover the screen
//   2. once the screen is FULLY covered, call landingGate.commit()   (the swap happens behind you)
//   3. give the swap a few frames to lay out and paint, then reveal what is underneath
//   4. when the reveal is done, call landingGate.finish()            (input unlocks)
// The same sequence plays in both directions (entering the page, and pulling back up into the scene).
import { useEffect, useRef } from "react";
import { landingGate } from "@/providers/landing-gate";

const COVER_MS = 800;
const REVEAL_MS = 800;
const COVER_EASE = "cubic-bezier(0.76, 0, 0.24, 1)";
const REVEAL_EASE = "cubic-bezier(0.76, 0, 0.24, 1)";
const BOX_COLOR = "#EF0026";

export default function HeroTransition() {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const unregister = landingGate.registerOverlay();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = (n: number) => (reduced ? 1 : n);
    const frames = (n: number) =>
      new Promise<void>((resolve) => {
        const step = () => (n-- <= 0 ? resolve() : requestAnimationFrame(step));
        step();
      });

    let cancelled = false;
    let animation: Animation | null = null;

    const play = async () => {
      try {
        // ---- 1. COVER: a box scales from 0% to 100% of the viewport, from the centre ----
        box.style.transformOrigin = "50% 50%";
        box.style.visibility = "visible";
        box.style.pointerEvents = "auto"; // swallow clicks while it plays
        animation = box.animate(
          [{ transform: "scale(0)" }, { transform: "scale(1)" }],
          { duration: ms(COVER_MS), easing: COVER_EASE, fill: "forwards" }
        );
        await animation.finished;
        if (cancelled) return;

        // ---- 2. the screen is fully covered: swap the scene and the page underneath ----
        landingGate.commit();
        await frames(3); // let the page lay out and paint before it is shown
        if (cancelled) return;

        // ---- 3. REVEAL: the box wipes away upwards ----
        animation.cancel();
        box.style.transformOrigin = "50% 0%";
        animation = box.animate(
          [{ transform: "scale(1, 1)" }, { transform: "scale(1, 0)" }],
          { duration: ms(REVEAL_MS), easing: REVEAL_EASE, fill: "forwards" }
        );
        await animation.finished;
        if (cancelled) return;

        animation.cancel();
        box.style.visibility = "hidden";
        box.style.pointerEvents = "none";
        landingGate.finish();
      } catch (error) {
        if (cancelled) return; // cancelled by an unmount: nothing to do
        // Never leave the cover up: complete the hand-off so the page isn't stuck behind it
        console.error("[HeroTransition] the transition failed, completing it:", error);
        landingGate.commit();
        landingGate.finish();
      }
    };

    const unsubscribe = landingGate.on((event) => {
      if (event.type === "begin") void play();
      if (event.type === "finish") {
        // also reached when the gate completes a transition by force: take the cover down
        animation?.cancel();
        box.style.visibility = "hidden";
        box.style.pointerEvents = "none";
      }
    });

    return () => {
      cancelled = true;
      animation?.cancel();
      unsubscribe();
      unregister();
    };
  }, []);

  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      data-hero-transition=""
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000, // above the canvas wrapper (z-index 100000000) and everything else
        background: BOX_COLOR,
        transform: "scale(0)",
        visibility: "hidden",
        pointerEvents: "none",
        willChange: "transform",
      }}
    />
  );
}
