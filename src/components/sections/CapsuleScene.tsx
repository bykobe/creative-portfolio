"use client";

// src/components/sections/CapsuleScene.tsx
// A Matter.js box of chunky capsule buttons. Nothing runs (and matter-js isn't even downloaded)
// until the top of the box reaches the middle of the screen; then the buttons pour in from the
// top edge, land, pile up, and can be dragged around with the mouse. Buttons with an `href`
// can be clicked.

import { useEffect, useRef } from "react";
import styles from "./CallToAction.module.css";

// ── Tweakables ──────────────────────────────────────────────────────────────────────────────
// One button is made per entry. Add `href` to make it clickable.
const BUTTONS: { label: string; href?: string }[] = [
  { label: "Say hiii", href: "mailto:hi@bykobe.dev" },
  { label: "Let’s chat", href: "mailto:hi@bykobe.dev" },
  { label: "Send a message", href: "mailto:hi@bykobe.dev" },
  { label: "Design Engineer" },
  { label: "Three.js" },
  { label: "Next.js" },
  { label: "GSAP" },
  { label: "Shaders" },
  { label: "Accra" },
  { label: "Open to work" },
  { label: "Say hello" },
  { label: "Figma" },
  { label: "Creative dev" },
  { label: "hi@bykobe.dev", href: "mailto:hi@bykobe.dev" },
];
const COLORS = [
  { bg: "#1c3fd0", fg: "#ffffff" },
  { bg: "#029902", fg: "#ffffff" },
  { bg: "#ffbe1a", fg: "#111111" },
  { bg: "#ff3b00", fg: "#ffffff" },
  { bg: "#ff8fc7", fg: "#111111" },
  { bg: "#ffffff", fg: "#111111" },
];
const INK = "#111111"; //        outline + the thick bottom edge
const LIP = 6; //                px of "button thickness" under the face
const SPAWN_EVERY_MS = 160; //   gap between each one dropping in
const START_AT = "50%"; //       the box starts when its top edge reaches this much of the screen height

type Btn = { w: number; h: number; face: number; bg: string; fg: string; label: string; fs: number; href?: string };

export default function CapsuleScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    let disposed = false;
    let stop: () => void = () => {};

    const start = async () => {
      // Loaded only now, so the library never costs anything for visitors who don't scroll this far
      const Matter = (await import("matter-js")).default;
      await document.fonts.ready; // measure the text in the real font
      if (disposed) return;
      const { Engine, Bodies, Body, Query, Composite, Mouse, MouseConstraint } = Matter;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const fontFamily = getComputedStyle(wrap).fontFamily;
      let w = wrap.clientWidth;
      let h = wrap.clientHeight;

      const engine = Engine.create({ enableSleeping: true });
      engine.gravity.y = 1;

      // ── walls: a floor and two sides. No ceiling, so buttons can drop in from above. ─────────
      let walls: Matter.Body[] = [];
      const buildWalls = () => {
        Composite.remove(engine.world, walls);
        const t = 200;
        const tall = h + 2000;
        const opts = { isStatic: true, friction: 0.4 };
        walls = [
          Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t, opts),
          Bodies.rectangle(-t / 2, h / 2 - 1000, t, tall, opts),
          Bodies.rectangle(w + t / 2, h / 2 - 1000, t, tall, opts),
        ];
        Composite.add(engine.world, walls);
      };

      const fit = () => {
        w = wrap.clientWidth;
        h = wrap.clientHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      };
      fit();
      buildWalls();

      // ── buttons ────────────────────────────────────────────────────────────────────────────
      const bodies: Matter.Body[] = [];
      const info = (b: Matter.Body) => b.plugin.btn as Btn;

      // Colours are dealt out in a shuffled order so neighbours rarely match
      const order = [...BUTTONS].sort(() => Math.random() - 0.5);
      let next = 0;

      const addButton = (y?: number) => {
        const spec = order[next % order.length];
        const color = COLORS[next % COLORS.length];
        next++;

        const face = Math.max(54, Math.min(84, w * 0.052)); // chunky: tall for its text
        const fs = face * 0.42;
        ctx.font = `600 ${fs}px ${fontFamily}`;
        const bw = Math.ceil(ctx.measureText(spec.label).width + face * 1.1);
        const bh = face + LIP;
        const btn: Btn = { w: bw, h: bh, face, bg: color.bg, fg: color.fg, label: spec.label, fs, href: spec.href };

        const body = Bodies.rectangle(
          bw / 2 + Math.random() * Math.max(1, w - bw),
          y ?? -bh - Math.random() * 100,
          bw,
          bh,
          {
            chamfer: { radius: bh / 2 }, // fully rounded ends = a capsule
            restitution: 0.25,
            friction: 0.4,
            frictionAir: 0.012,
            density: 0.0016,
            angle: (Math.random() - 0.5) * Math.PI * 0.8,
            plugin: { btn },
          },
        );
        bodies.push(body);
        Composite.add(engine.world, body);
      };

      // ── drawing ────────────────────────────────────────────────────────────────────────────
      const draw = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        for (const body of bodies) {
          const b = info(body);
          ctx.save();
          ctx.translate(body.position.x, body.position.y);
          ctx.rotate(body.angle);

          const left = -b.w / 2;
          const top = -b.h / 2;
          // the thick bottom edge, then the face on top of it
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.roundRect(left, top + LIP, b.w, b.face, b.face / 2);
          ctx.fill();

          ctx.fillStyle = b.bg;
          ctx.strokeStyle = INK;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(left + 1.5, top + 1.5, b.w - 3, b.face - 3, (b.face - 3) / 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = b.fg;
          ctx.font = `600 ${b.fs}px ${fontFamily}`;
          ctx.fillText(b.label, 0, top + b.face / 2 + b.fs * 0.04);
          ctx.restore();
        }
      };

      // Reduced motion: no animation. Let the pile settle off-screen and just show the result.
      if (reduceMotion) {
        for (let i = 0; i < BUTTONS.length; i++) addButton(Math.random() * h * 0.5);
        for (let i = 0; i < 900; i++) Engine.update(engine, 1000 / 60);
        draw();
        stop = () => Engine.clear(engine);
        return;
      }

      // ── drag with the mouse; click a linked button to follow it (mouse devices only, so touch
      //    scrolling is never blocked) ───────────────────────────────────────────────────────
      let mouseConstraint: Matter.MouseConstraint | null = null;
      let removePointer = () => {};
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        canvas.setAttribute("data-pixel-ratio", String(dpr)); // so Matter maps the mouse correctly
        const mouse = Mouse.create(canvas);
        // Matter's mouse swallows the wheel; give it back so the page still scrolls over the canvas
        const m = mouse as unknown as { mousewheel: EventListener; element: HTMLElement };
        for (const type of ["wheel", "mousewheel", "DOMMouseScroll"]) {
          m.element.removeEventListener(type, m.mousewheel);
        }
        mouseConstraint = MouseConstraint.create(engine, {
          mouse,
          constraint: { stiffness: 0.2, render: { visible: false } },
        });
        Composite.add(engine.world, mouseConstraint);

        const under = () => Query.point(bodies, mouse.position)[0];
        let down: { x: number; y: number; t: number; body?: Matter.Body } | null = null;
        const onDown = () => {
          down = { x: mouse.position.x, y: mouse.position.y, t: performance.now(), body: under() };
          canvas.dataset.state = "grabbing";
        };
        const onMove = () => {
          if (canvas.dataset.state === "grabbing") return;
          const hit = under();
          canvas.dataset.state = hit ? (info(hit).href ? "link" : "grab") : "";
        };
        const onUp = () => {
          const d = down;
          down = null;
          canvas.dataset.state = "";
          if (!d?.body) return;
          const moved = Math.hypot(mouse.position.x - d.x, mouse.position.y - d.y);
          const href = info(d.body).href;
          if (href && moved < 6 && performance.now() - d.t < 350) window.location.href = href;
        };
        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        removePointer = () => {
          canvas.removeEventListener("pointerdown", onDown);
          canvas.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
        };
      }

      // ── loop: runs only while the box is on screen ─────────────────────────────────────────
      let raf = 0;
      let last = 0;
      const frame = (t: number) => {
        raf = requestAnimationFrame(frame);
        const dt = Math.min(t - last || 16, 32);
        last = t;
        Engine.update(engine, dt);
        draw();
      };
      const run = () => {
        if (!raf) {
          last = 0;
          raf = requestAnimationFrame(frame);
        }
      };
      const pause = () => {
        cancelAnimationFrame(raf);
        raf = 0;
      };
      const visibility = new IntersectionObserver(([e]) => (e.isIntersecting ? run() : pause()));
      visibility.observe(wrap);

      // ── pour them in ───────────────────────────────────────────────────────────────────────
      let spawned = 0;
      const spawner = window.setInterval(() => {
        addButton();
        if (++spawned >= BUTTONS.length) window.clearInterval(spawner);
      }, SPAWN_EVERY_MS);

      // ── keep it sane when the window changes size ──────────────────────────────────────────
      const resize = new ResizeObserver(() => {
        fit();
        buildWalls();
        for (const b of bodies) {
          const half = info(b).w / 2;
          if (b.position.x > w - half) Body.setPosition(b, { x: w - half, y: b.position.y });
        }
      });
      resize.observe(wrap);

      stop = () => {
        window.clearInterval(spawner);
        pause();
        removePointer();
        visibility.disconnect();
        resize.disconnect();
        if (mouseConstraint) Composite.remove(engine.world, mouseConstraint);
        Composite.clear(engine.world, false);
        Engine.clear(engine);
      };
    };

    // The trigger: rootMargin shrinks the bottom of the "screen" by half, so the box counts as
    // visible exactly when its top edge crosses the middle of the viewport.
    const trigger = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        trigger.disconnect();
        start();
      },
      { rootMargin: `0px 0px -${START_AT} 0px`, threshold: 0 },
    );
    trigger.observe(wrap);

    return () => {
      disposed = true;
      trigger.disconnect();
      stop();
    };
  }, []);

  return (
    <div ref={wrapRef} className={styles.cta_dsn_wrapper}>
      <canvas ref={canvasRef} className={styles.cta_dsn_canvas} aria-hidden="true" />
    </div>
  );
}
