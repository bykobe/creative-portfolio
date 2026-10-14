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
import KobeSprite from "../ui/svgs/KobeSprite";

// ── Tweakables ──────────────────────────────────────────────────────────────
const BLOB_COLOR = "#0000FF"; // Difference blend over bright yellow (#FFFF00) creates black

const MIN_DURATION = 3.2; // seconds
const REPEAT_MIN_DURATION = 1.6; // seconds for returning visitors
const FAIL_SAFE = 30; // seconds
const HOLD = 0.35; // seconds at 100 before exit reveal
const REVEAL_DURATION = 1.3; // dissolve transition back to page
const SEEN_KEY = "preloader:seen";

const FAKE_PROGRESS = true;
const CREEP_CEILING = 88;
const CREEP_TAU = 4.5;
const ASSET_SHARE = 90;
const COVER_AT = 92;

// Each line is treated as its own independent text entity with its own position
const MESSAGES = [
  {
    id: "line-1",
    at: 0,
    text: "Please be patient",
    positionClass: styles.line1,
  },
  {
    id: "line-2",
    at: 14,
    text: "as I find my thinking hat",
    positionClass: styles.line2,
  },
  {
    id: "line-3",
    at: 28,
    text: "Still gathering data on Kobe",
    positionClass: styles.line3,
  },
  {
    id: "line-4",
    at: 42,
    text: "... where is he hiding???",
    positionClass: styles.line4,
  },
  {
    id: "line-5",
    at: 58,
    text: "probably busy doing some",
    positionClass: styles.line5,
  },
  {
    id: "line-6",
    at: 72,
    text: "cool sh*t or he’s asleep ?",
    positionClass: styles.line6,
  },
  {
    id: "line-7",
    at: 85,
    text: "this is a reallly large website",
    positionClass: styles.line7,
  },
  {
    id: "line-8",
    at: 92,
    text: "sorry for the delay, wont happen again",
    positionClass: styles.line8,
  },
];

const ROWS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
const ROW_PCT = 100 / ROWS.length;
// ────────────────────────────────────────────────────────────────────────────

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const smooth = (t: number) => t * t * (3 - 2 * t);

interface PreloaderProps {
  onRevealStart?: () => void;
  onComplete?: () => void;
  characterSpriteUrl?: string;
}

export default function Preloader({
  onRevealStart,
  onComplete,
  characterSpriteUrl,
}: PreloaderProps) {
  const [finished, setFinished] = useState(false);
  const [progress, setProgress] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const stripRefs = useRef<(HTMLSpanElement | null)[]>([]);
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
      /* storage blocked */
    }

    const mountedAt = performance.now();
    let displayed = 0;
    let fieldP = reduceMotion ? 1 : 0;
    let exiting = false;
    let exitTimeline: gsap.core.Timeline | null = null;

    // ── Counter Logic ──────────────────────────────────────────────────────
    const setDigits = (v: number) => {
      const onesRaw = v % 10;
      const ones = Math.floor(onesRaw) + smooth(onesRaw % 1);
      const tens = Math.floor(v / 10) + smooth(clamp(onesRaw - 9));
      const hundreds = Math.floor(v / 100) + smooth(clamp((v % 100) - 99));

      [ones, tens, hundreds].forEach((pos, i) => {
        const strip = stripRefs.current[2 - i];
        if (strip) strip.style.transform = `translate3d(0, ${-pos * ROW_PCT}%, 0)`;
      });

      const hundredsCol = colRefs.current[0];
      const tensCol = colRefs.current[1];
      if (hundredsCol) hundredsCol.style.opacity = `${v >= 100 ? 1 : 0}`;
      if (tensCol) tensCol.style.opacity = `${v >= 10 ? 1 : 0}`;
    };

    // ── Exit Animation ─────────────────────────────────────────────────────
    const finish = () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", onResize);
      html.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* storage blocked */
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

      const proxy = { p: Math.min(fieldP, FIELD_NEARLY_FULL) };
      exitTimeline
        .to(targets, {
          opacity: 0,
          y: -20,
          duration: 0.45,
          ease: "power2.in",
          stagger: 0.03,
        })
        .add(() => {
          paper.style.display = "none";
          ui.style.visibility = "hidden";
          startReveal();
        })
        .to(proxy, {
          p: 0,
          duration: REVEAL_DURATION,
          ease: "power2.inOut",
          onUpdate: () => {
            fieldP = proxy.p;
          },
        });
    };

    // ── Main Frame Loop ────────────────────────────────────────────────────
    const tick = (_time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 100) / 1000;
      const elapsed = (performance.now() - mountedAt) / 1000;

      if (!exiting) {
        const { assets, sceneReady } = preloader.getState();
        const ready = elapsed > FAIL_SAFE || (assets >= 100 && sceneReady);

        const real = assets * (ASSET_SHARE / 100) + (sceneReady ? 100 - ASSET_SHARE : 0);
        const creep = FAKE_PROGRESS
          ? CREEP_CEILING * (1 - Math.exp(-elapsed / CREEP_TAU))
          : 0;
        const gate = clamp(elapsed / minDuration) * 100;
        const target = Math.min(ready ? 100 : Math.max(real, creep), gate);

        const rate = ready ? 14 : 6;
        displayed += (target - displayed) * (1 - Math.exp(-dt * rate));
        if (target >= 100 && displayed > 99.2) displayed = 100;

        if (!reduceMotion) {
          const intro = 0.05 * easeOutCubic(clamp(elapsed / 1));
          fieldP = Math.max(intro, FIELD_FULL_AT * clamp(displayed / COVER_AT));
        }

        setDigits(displayed);
        setProgress(displayed);

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
        {/* Pixel Character Sprite top right (flipped upside down) */}
        <div className={styles.character} data-exit>
          {characterSpriteUrl ? (
            <img src={characterSpriteUrl} alt="" />
          ) : (
            <KobeSprite />
          )}
        </div>

        {/* Accumulating Individual Lines */}
        {MESSAGES.map((msg) => {
          const isVisible = progress >= msg.at;
          return (
            <div
              key={msg.id}
              className={`${styles.statusMessage} ${msg.positionClass} ${
                isVisible ? styles.visible : ""
              }`}
              data-exit
            >
              {msg.text}
            </div>
          );
        })}

        {/* Pixel Number Counter (Bottom-Left) */}
        <div className={styles.counterWrapper} data-exit>
          <div className={styles.counter}>
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
          </div>
        </div>
      </div>

      <span ref={srRef} className={styles.srOnly} role="status">
        {MESSAGES.filter((m) => progress >= m.at)
          .map((m) => m.text)
          .join(" ")}
      </span>
    </div>
  );
}
