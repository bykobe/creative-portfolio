"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import styles from "./preloader.module.css";
import {
  createPixelBlobField,
  FIELD_FULL_AT,
  FIELD_NEARLY_FULL,
} from "../utils/pixel-blob-field";
import { preloader } from "../hooks/preloaderStore";

// ── Tweakables ──────────────────────────────────────────────────────────────
const SITE_NAME = "Portfolio";
const YEAR = new Date().getFullYear();

// Keep this pure blue: the text is white with `mix-blend-mode: difference`,
// and white-minus-#0000FF is exactly yellow (the colour of your monitor).
const BLOB_COLOR = "#0000FF";

// All timings are measured from the start of the page load, since the cover
// is server-rendered and the visitor has been looking at it since first paint.
const MIN_DURATION = 2.8; // seconds. Even a cached load gets the full sequence
const REPEAT_MIN_DURATION = 1.4; // ...but a returning visitor (same tab session) gets a short one
const FAIL_SAFE = 25; // seconds. If the scene never reports in, open anyway
const HOLD = 0.3; // seconds the 100 sits on solid blue before the type leaves
const REVEAL_DURATION = 1.3; // seconds for the blobs to dissolve
const SEEN_KEY = "preloader:seen";

// A single big .glb reports 0% then 100%. A slow creep keeps the counter
// alive in between, but never gets ahead of CREEP_CEILING until it's real.
const FAKE_PROGRESS = true;
const CREEP_CEILING = 88;
const CREEP_TAU = 4.5;

// Share of the bar that is "assets downloaded"; the rest is "scene compiled"
const ASSET_SHARE = 90;

// Counter value at which the blobs have flooded the whole screen. The flood
// itself is S-shaped (dots, then a merge, then a rush), so it looks done a
// little earlier than this.
const COVER_AT = 92;

// Copy is keyed to what's actually on the desk
const MESSAGES = [
  { at: 0, text: "Setting up the desk" },
  { at: 22, text: "Plugging in the monitor" },
  { at: 46, text: "Booting the laptop" },
  { at: 70, text: "Rolling in the chair" },
  { at: 92, text: "Almost ready" },
  { at: 100, text: "Welcome" },
];

// Each counter column holds 0–9 plus a repeated 0, so 9 → 0 rolls seamlessly
const ROWS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
const ROW_PCT = 100 / ROWS.length;
// ────────────────────────────────────────────────────────────────────────────

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const smooth = (t: number) => t * t * (3 - 2 * t);

interface PreloaderProps {
  /** Fires the moment the cover starts to dissolve. Start your camera intro here. */
  onRevealStart?: () => void;
  /** Fires once the cover is gone and unmounted. */
  onComplete?: () => void;
}

export default function Preloader({ onRevealStart, onComplete }: PreloaderProps) {
  const [finished, setFinished] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const stripRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const statusRef = useRef<HTMLDivElement>(null);
  const srRef = useRef<HTMLSpanElement>(null);
  const callbacks = useRef({ onRevealStart, onComplete });

  useEffect(() => {
    callbacks.current = { onRevealStart, onComplete };
  });

  useEffect(() => {
    const root = rootRef.current;
    const paper = paperRef.current;
    const canvas = canvasRef.current;
    const ui = uiRef.current;
    if (!root || !paper || !canvas || !ui) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // No scrolling behind the cover
    const html = document.documentElement;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const field = createPixelBlobField(canvas, { color: BLOB_COLOR });
    field.resize();

    let minDuration = MIN_DURATION;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) minDuration = REPEAT_MIN_DURATION;
    } catch {
      /* storage blocked: treat everyone as a first-time visitor */
    }

    const mountedAt = performance.now();
    let displayed = 0; // the number on screen, 0–100
    let fieldP = reduceMotion ? 1 : 0; // blob progress, 0–1
    let exiting = false;
    let messageIndex = 0;
    let exitTimeline: gsap.core.Timeline | null = null;

    // ── Counter ────────────────────────────────────────────────────────────
    const setDigits = (v: number) => {
      // Each digit dwells on its number and rolls to the next in a quick
      // ease, instead of scrolling constantly (which reads as half-digits).
      const onesRaw = v % 10;
      const ones = Math.floor(onesRaw) + smooth(onesRaw % 1);
      // Tens and hundreds only move while the digit below them rolls over
      const tens = Math.floor(v / 10) + smooth(clamp(onesRaw - 9));
      const hundreds = Math.floor(v / 100) + smooth(clamp((v % 100) - 99));
      [ones, tens, hundreds].forEach((pos, i) => {
        // columns are stored ones, tens, hundreds → DOM order is reversed
        const strip = stripRefs.current[2 - i];
        if (strip) strip.style.transform = `translate3d(0, ${-pos * ROW_PCT}%, 0)`;
      });

      // Leading zeros stay dim until they matter
      const hundredsCol = colRefs.current[0];
      const tensCol = colRefs.current[1];
      if (hundredsCol) hundredsCol.style.opacity = `${0.18 + 0.82 * clamp(v - 99)}`;
      if (tensCol) tensCol.style.opacity = `${0.18 + 0.82 * clamp(v - 9)}`;
    };

    // ── Status line ────────────────────────────────────────────────────────
    const showMessage = (text: string) => {
      const host = statusRef.current;
      if (!host) return;
      if (srRef.current) srRef.current.textContent = text;

      const line = document.createElement("span");
      line.className = styles.statusLine;
      line.textContent = text;
      host.appendChild(line);

      const previous = line.previousElementSibling;
      if (reduceMotion) {
        previous?.remove();
        return;
      }
      gsap.fromTo(
        line,
        { yPercent: 100 },
        { yPercent: 0, duration: 0.6, ease: "power3.out" }
      );
      if (previous) {
        gsap.to(previous, {
          yPercent: -100,
          duration: 0.6,
          ease: "power3.out",
          onComplete: () => previous.remove(),
        });
      }
    };

    // ── Exit ───────────────────────────────────────────────────────────────
    const finish = () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", onResize);
      html.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* storage blocked: fine */
      }
      preloader.setPhase("done");
      setFinished(true);
      callbacks.current.onComplete?.();
    };

    const startReveal = () => {
      root.dataset.phase = "revealing";
      preloader.setPhase("revealing");
      callbacks.current.onRevealStart?.();
    };

    const beginExit = () => {
      if (exiting) return;
      exiting = true;

      const targets = root.querySelectorAll("[data-exit]");
      exitTimeline = gsap.timeline({ delay: HOLD, onComplete: finish });

      if (reduceMotion) {
        exitTimeline
          .add(startReveal)
          .to(root, { opacity: 0, duration: 0.5, ease: "power1.out" });
        return;
      }

      // Start where the first holes are about to open, not at "fully solid"
      const proxy = { p: Math.min(fieldP, FIELD_NEARLY_FULL) };
      exitTimeline
        // The type slides up and out of its masks
        .to(targets, {
          yPercent: -110,
          duration: 0.55,
          ease: "power3.in",
          stagger: 0.04,
        })
        // Blue covers every pixel now, so the paper underneath can go unseen
        .add(() => {
          paper.style.display = "none";
          ui.style.visibility = "hidden";
          startReveal();
        })
        // The blobs shrink back and the scene appears through them
        .to(proxy, {
          p: 0,
          duration: REVEAL_DURATION,
          ease: "power2.inOut",
          onUpdate: () => {
            fieldP = proxy.p;
          },
        });
    };

    // ── Frame loop ─────────────────────────────────────────────────────────
    const tick = (_time: number, deltaMs: number) => {
      // While the scene compiles, frames can be very long; don't let one jump the animation
      const dt = Math.min(deltaMs, 100) / 1000;
      const now = performance.now();
      const elapsed = now / 1000; // since navigation start
      const sinceMount = (now - mountedAt) / 1000;

      if (!exiting) {
        const { assets, sceneReady } = preloader.getState();
        const ready = elapsed > FAIL_SAFE || (assets >= 100 && sceneReady);

        const real = assets * (ASSET_SHARE / 100) + (sceneReady ? 100 - ASSET_SHARE : 0);
        const creep = FAKE_PROGRESS
          ? CREEP_CEILING * (1 - Math.exp(-elapsed / CREEP_TAU))
          : 0;
        const gate = clamp(elapsed / minDuration) * 100; // never faster than minDuration
        const target = Math.min(ready ? 100 : Math.max(real, creep), gate);

        // Ease toward the target; catch up faster once there's nothing left to wait for
        const rate = ready ? 14 : 6;
        displayed += (target - displayed) * (1 - Math.exp(-dt * rate));
        if (target >= 100 && displayed > 99.2) displayed = 100;

        if (!reduceMotion) {
          // A first beat of tiny blobs so the start isn't an empty page
          const intro = 0.05 * easeOutCubic(clamp(sinceMount / 1));
          fieldP = Math.max(intro, FIELD_FULL_AT * clamp(displayed / COVER_AT));
        }

        setDigits(displayed);

        let next = messageIndex;
        for (let i = 0; i < MESSAGES.length; i++) {
          if (displayed >= MESSAGES[i].at) next = i;
        }
        if (next !== messageIndex) {
          messageIndex = next;
          showMessage(MESSAGES[next].text);
        }

        if (displayed >= 100) beginExit();
      }

      if (!reduceMotion) {
        field.step(dt, fieldP);
        field.draw(fieldP);
      }
    };

    const onResize = () => {
      field.resize();
      field.draw(fieldP);
    };

    if (reduceMotion) paper.style.display = "none";
    field.draw(fieldP);
    setDigits(0);
    window.addEventListener("resize", onResize);
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", onResize);
      exitTimeline?.kill();
      html.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  if (finished) return null;

  return (
    <div ref={rootRef} className={styles.root} data-phase="loading">
      <div ref={paperRef} className={styles.paper} />
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

      <div ref={uiRef} className={styles.ui} aria-hidden="true">
        <div className={styles.top}>
          <span className={styles.mask}>
            <span className={`${styles.label} ${styles.rise}`} data-exit>
              {SITE_NAME} © {YEAR}
            </span>
          </span>
          <span className={styles.mask}>
            <span
              className={`${styles.label} ${styles.rise}`}
              style={{ animationDelay: "0.1s" }}
              data-exit
            >
              Loading experience
            </span>
          </span>
        </div>

        <div className={styles.bottom}>
          <div className={styles.mask}>
            <div
              className={`${styles.counter} ${styles.rise}`}
              style={{ animationDelay: "0.15s" }}
              data-exit
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  ref={(el) => {
                    colRefs.current[i] = el;
                  }}
                  className={styles.col}
                >
                  <span
                    ref={(el) => {
                      stripRefs.current[i] = el;
                    }}
                    className={styles.strip}
                  >
                    {ROWS.map((n, row) => (
                      <span key={row} className={styles.digit}>
                        {n}
                      </span>
                    ))}
                  </span>
                </span>
              ))}
              <span className={styles.pct}>%</span>
            </div>
          </div>

          <div className={styles.mask}>
            <div
              className={`${styles.status} ${styles.rise}`}
              style={{ animationDelay: "0.25s" }}
              data-exit
            >
              <span className={styles.pixels}>
                {Array.from({ length: 9 }, (_, i) => (
                  <i
                    key={i}
                    style={{
                      animationDelay: `${((i % 3) + Math.floor(i / 3)) * 0.12}s`,
                    }}
                  />
                ))}
              </span>
              <div ref={statusRef} className={styles.statusHost}>
                <span className={styles.statusLine}>{MESSAGES[0].text}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <span ref={srRef} className={styles.srOnly} role="status">
        {MESSAGES[0].text}
      </span>
    </div>
  );
}
