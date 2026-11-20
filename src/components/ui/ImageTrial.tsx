"use client";

/* ──────────────────────────────────────────────────────────────────────────────────────────────
   ImageTrail
   ──────────────────────────────────────────────────────────────────────────────────────────────
   Pictures appear behind the cursor as it moves across a section. Each one:

     1. pixelates in   – starts as big blocks and sharpens into the real picture
     2. sticks         – stays put on the "wall" for a moment
     3. falls          – drops off the bottom of the section, tumbling a little

   Usage (put it INSIDE the section it should live in):

     <section style={{ position: "relative" }}>
       <ImageTrail images={[imgA, imgB, imgC]} />
       ...the rest of the section...
     </section>

   How it works, in short:
     • One <canvas> covers the section. Everything is painted onto it with the 2D canvas API.
     • A list of "stickers" (plain objects) holds each picture's position, size, age and speed.
     • An animation loop (requestAnimationFrame) moves the stickers and repaints, and it switches
       itself off when there are no stickers left, so it costs nothing while the mouse is still.
     • Listening to the mouse is done on the window, so it works even though the canvas itself
       lets clicks through (pointer-events: none).
   ────────────────────────────────────────────────────────────────────────────────────────────── */

import { useEffect, useRef } from "react";
import styles from "./ui.module.css";

// A picture can be given as a plain URL string, or as an imported image (an object with a `src`).
type Src = string | { src: string };

export type ImageTrailProps = {
  /** The pictures to use. They are shown in order and loop round and round. */
  images: Src[];
  /** How far (px) the cursor must travel before the next sticker is allowed. Default 170. */
  distance?: number;
  /** Minimum time (ms) between one sticker and the next. Raise it for more breathing room. Default 320. */
  delay?: number;
  /** Sticker width in px. Default: 15% of the section width, kept between 130 and 260. */
  size?: number;
  /** How long (ms) a sticker stays stuck before it falls. Default 1100. */
  hold?: number;
  /** The most stickers allowed on screen at once. Default 14. */
  max?: number;
  /** Stacking order of the layer (like CSS z-index). Default 0. */
  zIndex?: number;
  className?: string;
};

/* ── Look and feel: change these numbers to tune it ────────────────────────────────────────── */
const PIXEL_IN = 340; //     ms the pixelated "sharpening" takes
const GRAVITY = 2300; //     how hard a sticker is pulled down once it lets go (px per second²)
const RADIUS = 0; //         rounded corners on the pictures, in px (0 = square)
const SHADOW = true; //      soft shadow under each sticker
// The pixelation goes through these steps: each number is how many blocks fit across the sticker.
// Small number = chunky blocks. After the last step the real, sharp picture is shown.
const PIXEL_STEPS = [4, 7, 12, 20, 34];

// One sticker on screen. Everything we need to draw it and move it lives here.
type Sticker = {
  sprite: HTMLCanvasElement; //          the finished picture, drawn once, at full sharpness
  steps: (HTMLCanvasElement | null)[]; // blocky versions of it, made on demand and remembered
  x: number; //                          centre of the sticker, in canvas pixels
  y: number;
  w: number; //                          size
  h: number;
  rot: number; //                        tilt in radians
  born: number; //                       time it appeared (ms)
  dropAt: number; //                     time it should let go and fall (ms)
  falling: boolean; //                   false = stuck to the wall, true = dropping
  vx: number; //                         sideways speed while falling
  vy: number; //                         downward speed while falling
  vr: number; //                         spin speed while falling
};

// Smooth start and end for animations: takes 0..1 and returns 0..1 on an S curve.
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const urlOf = (s: Src) => (typeof s === "string" ? s : s.src);

export default function ImageTrail({
  images,
  distance = 170,
  delay = 320,
  size,
  hold = 1100,
  max = 14,
  zIndex = 0,
  className,
}: ImageTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !images.length) return;

    // People who ask their system for less motion get nothing at all.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // The canvas is stretched over its parent with position: absolute, which only works if the
    // parent is itself "positioned". If it isn't, make it so (this does not change how it looks).
    const host = canvas.parentElement;
    if (host && getComputedStyle(host).position === "static") host.style.position = "relative";

    /* ── Sizing ───────────────────────────────────────────────────────────────────────────────
       W and H are the canvas size in CSS pixels (what we think in). The canvas' real pixel size is
       bigger on sharp screens (dpr = device pixel ratio), which keeps the pictures crisp. */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    const fit = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    fit();
    // Re-measure whenever the section changes size (window resize, layout change, etc.)
    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(canvas);

    /* ── Load the pictures once ───────────────────────────────────────────────────────────────
       Only pictures that have finished loading are added to `loaded`, so a slow or broken one is
       just skipped instead of causing an error. */
    const loaded: HTMLImageElement[] = [];
    images.forEach((s) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => loaded.push(img);
      img.src = urlOf(s);
    });

    /* ── Make a sticker's artwork ─────────────────────────────────────────────────────────────
       We paint the picture onto its own small canvas ONCE ("sprite"). Drawing that ready-made
       canvas every frame is much cheaper than re-cropping the original picture every frame. The
       picture is cropped to fill the sticker (like CSS object-fit: cover). */
    const makeSprite = (img: HTMLImageElement, w: number, h: number) => {
      const c = document.createElement("canvas");
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const g = c.getContext("2d")!;
      g.scale(dpr, dpr);
      g.beginPath();
      g.roundRect(0, 0, w, h, RADIUS);
      g.clip(); // anything drawn after this stays inside the rounded rectangle
      const k = Math.max(w / img.naturalWidth, h / img.naturalHeight); // scale needed to cover the box
      const dw = img.naturalWidth * k;
      const dh = img.naturalHeight * k;
      g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh); // centred
      return c;
    };

    /* ── Pixelate ─────────────────────────────────────────────────────────────────────────────
       The trick: shrink the sprite down to just a few pixels (each pixel becomes the average colour
       of its area), then blow it back up to full size with smoothing OFF, so each of those pixels
       turns into a hard-edged block. The result is cached so it is only made once per step. */
    const pixelated = (s: Sticker, step: number) => {
      const cached = s.steps[step];
      if (cached) return cached;

      const blocks = PIXEL_STEPS[step];
      const tiny = document.createElement("canvas");
      tiny.width = blocks;
      tiny.height = Math.max(2, Math.round((blocks * s.h) / s.w));
      const tg = tiny.getContext("2d")!;
      tg.drawImage(s.sprite, 0, 0, tiny.width, tiny.height); // shrink (smoothing on = averaging)

      const out = document.createElement("canvas");
      out.width = s.sprite.width;
      out.height = s.sprite.height;
      const og = out.getContext("2d")!;
      og.imageSmoothingEnabled = false; //                      OFF = sharp square blocks
      og.drawImage(tiny, 0, 0, out.width, out.height); //      blow back up

      s.steps[step] = out;
      return out;
    };

    /* ── Draw one sticker ─────────────────────────────────────────────────────────────────────── */
    const drawSticker = (s: Sticker, now: number) => {
      // How old is it? (max(0, …) because the frame's clock can be a hair behind a brand new sticker)
      const age = Math.max(0, now - s.born);

      let art: HTMLCanvasElement = s.sprite; // normally the sharp picture…
      let alpha = 1;
      let scale = 1;

      if (age < PIXEL_IN) {
        // …but while it is still arriving, use a blocky version instead.
        const progress = age / PIXEL_IN; //                          0 → 1 over the pixel-in time
        const step = Math.min(PIXEL_STEPS.length - 1, Math.floor(progress * (PIXEL_STEPS.length + 0.6)));
        art = pixelated(s, step); //                                 coarse first, finer later
        alpha = Math.min(1, age / 70); //                            quick fade-in so it doesn't just blink on
        scale = 1.08 - 0.08 * ease(progress); //                     lands slightly big, settles to normal (a "slap")
      }

      ctx.save(); // remember the canvas state so we can undo the moves below
      ctx.globalAlpha = alpha;
      ctx.translate(s.x, s.y); // move the origin to the sticker's centre…
      ctx.rotate(s.rot); //       …tilt everything…
      ctx.scale(scale, scale); // …and scale it. Now we can draw around (0, 0).

      if (SHADOW) {
        ctx.shadowColor = "rgba(0,0,0,0.28)";
        ctx.shadowBlur = s.falling ? 26 : 12; //  bigger, softer shadow while it falls = it is "lifted off the wall"
        ctx.shadowOffsetY = s.falling ? 14 : 4;
      }

      ctx.drawImage(art, -s.w / 2, -s.h / 2, s.w, s.h);
      ctx.restore(); // put the canvas back how it was for the next sticker
    };

    /* ── The animation loop ───────────────────────────────────────────────────────────────────
       Runs once per screen refresh while there is at least one sticker, then stops by itself. */
    const stickers: Sticker[] = [];
    let raf = 0; //  id of the scheduled frame (0 = loop is not running)
    let last = 0; // timestamp of the previous frame, to measure how much time has passed

    const frame = (now: number) => {
      // dt = seconds since the last frame. Capped so a hidden tab can't cause a huge jump.
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;

      // Update every sticker. Looping backwards so we can safely remove finished ones.
      for (let i = stickers.length - 1; i >= 0; i--) {
        const s = stickers[i];

        // Time to let go? Switch from "stuck" to "falling".
        if (!s.falling && now >= s.dropAt) s.falling = true;

        if (s.falling) {
          s.vy += GRAVITY * dt; //  gravity speeds it up every frame
          s.x += s.vx * dt; //      drift sideways
          s.y += s.vy * dt; //      fall
          s.rot += s.vr * dt; //    spin
          // Fully below the bottom edge of the section? Remove it.
          if (s.y - s.h > H + 80) stickers.splice(i, 1);
        }
      }

      // Repaint: wipe the canvas, then draw every sticker (oldest first, so newest ends up on top).
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (const s of stickers) drawSticker(s, now);

      // Keep going only if something is left to animate.
      raf = stickers.length ? requestAnimationFrame(frame) : 0;
      if (!stickers.length) last = 0;
    };

    /* ── Add a sticker ─────────────────────────────────────────────────────────────────────────
       x and y are where the cursor is, in canvas pixels. */
    let next = 0; // which picture comes next
    const spawn = (x: number, y: number) => {
      if (!loaded.length) return; // nothing has finished loading yet

      const img = loaded[next++ % loaded.length]; // pick the next picture, looping round
      const w = size ?? Math.min(260, Math.max(130, W * 0.15));
      // Keep the picture's own shape, but not too tall or too flat.
      const h = Math.round(w * Math.min(1.35, Math.max(0.75, img.naturalHeight / img.naturalWidth)));
      const now = performance.now();

      // Already at the limit? Make the oldest stuck sticker let go right now to make room.
      if (stickers.filter((s) => !s.falling).length >= max) {
        const oldest = stickers.find((s) => !s.falling);
        if (oldest) oldest.dropAt = now;
      }

      stickers.push({
        sprite: makeSprite(img, w, h),
        steps: [],
        x,
        y,
        w,
        h,
        rot: (Math.random() - 0.5) * 0.28, //                tiny random tilt, like it was placed by hand
        born: now,
        dropAt: now + PIXEL_IN + hold + Math.random() * 250, // pixelate-in time + hold time + a little randomness
        falling: false,
        vx: (Math.random() - 0.5) * 90, //                   small random sideways drift
        vy: 0, //                                            starts still, gravity does the rest
        vr: (Math.random() - 0.5) * 2.4, //                  random spin direction and speed
      });

      if (!raf) raf = requestAnimationFrame(frame); // wake the loop up if it was asleep
    };

    /* ── Listen to the cursor ─────────────────────────────────────────────────────────────────
       A new sticker needs BOTH:
         – the cursor to have travelled at least `distance` pixels since the last one, and
         – at least `delay` milliseconds to have passed since the last one.
       That second rule is what spaces the stickers out in time, however fast the mouse moves. */
    let lastX = -1;
    let lastY = -1;
    let travelled = 0; //  pixels moved since the last sticker
    let lastSpawn = 0; //  time the last sticker appeared

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // fingers scroll the page; don't scatter pictures

      // Where is the cursor relative to THIS section? (re-measured each time, so scrolling is handled)
      const box = canvas.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      const inside = x >= 0 && y >= 0 && x <= box.width && y <= box.height;

      if (!inside) {
        lastX = -1; // forget the position so re-entering doesn't count as a long jump
        return;
      }

      if (lastX >= 0) travelled += Math.hypot(x - lastX, y - lastY);
      lastX = x;
      lastY = y;

      const now = performance.now();
      if (travelled >= distance && now - lastSpawn >= delay) {
        travelled = 0;
        lastSpawn = now;
        spawn(x, y);
      } else if (travelled > distance) {
        travelled = distance; // waiting out the delay: don't let it pile up into a burst afterwards
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // Cleanup when the component goes away (or its settings change).
    return () => {
      window.removeEventListener("pointermove", onMove);
      resizeObserver.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [images, distance, delay, size, hold, max]);

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.canvas} ${className ?? ""}`}
      style={{ zIndex }}
      aria-hidden="true" // decorative, so screen readers skip it
    />
  );
}
