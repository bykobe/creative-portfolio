"use client";

import styles from "./provider.module.css";
import { TransitionRouter } from "next-transition-router";
import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";

// ── Tweakables ──────────────────────────────────────────────────────────────
const PIXEL_SIZE = 16; // chunkiness of the pixel grid (lower = finer)
const BLOB_COLOR = "#0000FF";
const LEAVE_DURATION = 1.1; // blobs grow and cover the page
const ENTER_DURATION = 1.1; // blobs shrink away to reveal the new page
const EASE = "power1.inOut";
const BASE_THRESHOLD = 14000; // metaball threshold at rest; falls as progress rises
const FULL_COVER_AT = 0.92; // past this progress, skip the field and fill the screen

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  maxRadius: number;
}

// x / y are fractions of the viewport; reach is a multiple of its longest side.
const BLOB_SEEDS = [
  { x: 0.15, y: 0.15, vx: 0.4, vy: 0.3, radius: 40, reach: 0.9 },
  { x: 0.8, y: 0.2, vx: -0.3, vy: 0.5, radius: 70, reach: 0.95 },
  { x: 0.2, y: 0.5, vx: 0.5, vy: -0.2, radius: 60, reach: 0.9 },
  { x: 0.65, y: 0.6, vx: -0.4, vy: -0.4, radius: 90, reach: 1.1 },
  { x: 0.3, y: 0.85, vx: 0.3, vy: -0.3, radius: 50, reach: 0.85 },
  { x: 0.75, y: 0.85, vx: -0.2, vy: -0.5, radius: 55, reach: 0.9 },
];

export default function TransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef({ value: 0 }); // 0 = nothing on screen, 1 = fully covered
  const blobsRef = useRef<Blob[]>([]);
  const timeRef = useRef(0);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  const seedBlobs = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas;
    const longest = Math.max(width, height);
    blobsRef.current = BLOB_SEEDS.map((s) => ({
      x: width * s.x,
      y: height * s.y,
      vx: s.vx,
      vy: s.vy,
      baseRadius: s.radius,
      maxRadius: longest * s.reach,
    }));
  }, []);

  // Ambient float before the blobs take over the screen
  const drift = useCallback(() => {
    timeRef.current += 0.03;
    if (progressRef.current.value >= 0.5) return;
    const t = timeRef.current;
    blobsRef.current.forEach((blob, i) => {
      blob.x += Math.sin(t + i) * blob.vx;
      blob.y += Math.cos(t * 0.8 + i) * blob.vy;
    });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { width, height } = canvas;
    const p = progressRef.current.value;

    ctx.clearRect(0, 0, width, height);
    if (p <= 0) return;

    ctx.fillStyle = BLOB_COLOR;

    if (p > FULL_COVER_AT) {
      ctx.fillRect(0, 0, width, height);
      return;
    }

    const blobs = blobsRef.current;
    // Blobs grow out of nothing over the first 10% instead of popping in
    const grow = Math.min(1, p / 0.1);
    const threshold = BASE_THRESHOLD * (1 - p) + 200 * p;

    // Each blob's field strength only depends on progress, so compute it once per frame
    const strength = blobs.map((b) => {
      const radius = b.baseRadius * grow + (b.maxRadius - b.baseRadius) * p;
      return radius * radius * 1000;
    });

    const cols = Math.ceil(width / PIXEL_SIZE);
    const rows = Math.ceil(height / PIXEL_SIZE);
    const half = PIXEL_SIZE / 2;

    // One path, one fill: far cheaper than a fillRect per cell
    ctx.beginPath();
    for (let r = 0; r < rows; r++) {
      const py = r * PIXEL_SIZE + half;
      for (let c = 0; c < cols; c++) {
        const px = c * PIXEL_SIZE + half;
        let sum = 0;
        for (let i = 0; i < blobs.length; i++) {
          const dx = px - blobs[i].x;
          const dy = py - blobs[i].y;
          const distSq = dx * dx + dy * dy;
          sum += distSq > 1 ? strength[i] / distSq : 999999;
        }
        if (sum > threshold) {
          ctx.rect(
            c * PIXEL_SIZE,
            r * PIXEL_SIZE,
            PIXEL_SIZE + 0.5,
            PIXEL_SIZE + 0.5
          );
        }
      }
    }
    ctx.fill();
  }, []);

  useEffect(() => {
    resize();
    seedBlobs();

    const onResize = () => {
      resize(); // resizing wipes the canvas, so redraw the current frame
      draw();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [resize, seedBlobs, draw]);

  // Tween progress to `target`, drawing on every update. Returns a cleanup fn.
  const animateTo = useCallback(
    (target: 0 | 1, duration: number, next: () => void) => {
      const tween = gsap.to(progressRef.current, {
        value: target,
        duration,
        ease: EASE,
        onUpdate: () => {
          drift();
          draw();
        },
        onComplete: () => {
          draw();
          next();
        },
      });

      return () => {
        tween.kill();
      };
    },
    [drift, draw]
  );

  return (
    <TransitionRouter
      auto
      leave={(next) => {
        // Fresh layout for each cycle, unless an interrupted transition is mid-way
        if (progressRef.current.value === 0) {
          resize();
          seedBlobs();
        }
        return animateTo(1, LEAVE_DURATION, next);
      }}
      enter={(next) => animateTo(0, ENTER_DURATION, next)}
    >
      <canvas
        ref={canvasRef}
        className={styles.transitionCanvas}
        aria-hidden="true"
      />
      {children}
    </TransitionRouter>
  );
}
