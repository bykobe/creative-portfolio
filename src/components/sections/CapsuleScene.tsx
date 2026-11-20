"use client";

// src/components/sections/CapsuleScene.tsx
// A Matter.js box of flat, chunky pill buttons plus round icon buttons (a leopard chat bubble and a
// mail envelope), in a soft pastel palette with tight, heavy type. Same physics as before.
// A Matter.js box of chunky capsule buttons. Nothing runs (and matter-js isn't even downloaded)
// until the top of the box reaches the middle of the screen; then the buttons pour in from the
// top edge, land, pile up, and can be dragged around with the mouse. Buttons with an `href`
// can be clicked.

import { useEffect, useRef } from "react";
import styles from "./CallToAction.module.css";
import ClipText from "../ui/ClipText";

// ── Tweakables ──────────────────────────────────────────────────────────────────────────────
// One button is made per entry. Add `href` to make it clickable.
// `icon` makes it a round icon button instead of a text pill.
const BUTTONS: { label: string; href?: string; icon?: "chat" | "mail" }[] = [
  { label: "", icon: "chat", href: "mailto:hi@bykobe.dev" },
  { label: "", icon: "mail", href: "mailto:hi@bykobe.dev" },
  { label: "Say hiii", href: "mailto:hi@bykobe.dev" },
  { label: "Let’s chat", href: "https://x.com/bykobe_" },
  { label: "Send a message", href: "mailto:hi@bykobe.dev" },
  { label: "Based in Accra" },
  { label: "Design Engineer" },
  { label: "Open to work" },
  { label: "Say hello", href: "mailto:hi@bykobe.dev" },
];
// Flat pastel pills with a darker ink for the text, like the reference
const COLORS = [
  { bg: "#b9d68f", fg: "#1c2a12" }, // sage green
  { bg: "#f2d95c", fg: "#1a1608" }, // butter yellow
  { bg: "#6b1118", fg: "#fbe9e4" }, // oxblood
  { bg: "#c1285f", fg: "#f7c6df" }, // raspberry
  { bg: "#98dcdc", fg: "#10282a" }, // aqua
];
const ICON_STYLE = {
  chat: { bg: "#d29a4a", fg: "#ffffff" }, // leopard print, drawn in code
  mail: { bg: "#98dcdc", fg: "#161616" },
};
const FACE_MIN = 80; //          pill height range in px (scales with the box width in between)
const FACE_MAX = 160;
const SPAWN_EVERY_MS = 160; //   gap between each one dropping in
const START_AT = "35%"; //       the box starts when its top edge reaches this much of the screen height

type Btn = { w: number; h: number; bg: string; fg: string; label: string; fs: number; href?: string; icon?: "chat" | "mail" };

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

      // ── leopard print for the chat button: tan ground with ragged dark rosettes ──────────────────
      const leopard = document.createElement("canvas");
      leopard.width = leopard.height = 256;
      {
        const g = leopard.getContext("2d")!;
        g.fillStyle = "#d29a4a";
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 34; i++) {
          const x = Math.random() * 256, y = Math.random() * 256, r = 10 + Math.random() * 8;
          g.fillStyle = "#b87a30";
          g.beginPath();
          g.ellipse(x, y, r * 0.8, r * 0.7, Math.random() * 3, 0, 7);
          g.fill();
          g.fillStyle = "#2b1608";
          const n = 5 + Math.floor(Math.random() * 3);
          const open = Math.random() * 6.28;
          for (let k = 0; k < n; k++) {
            const a = open + 0.9 + (k / (n - 1)) * (6.28 - 1.8);
            g.beginPath();
            g.ellipse(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05, r * 0.38, r * 0.3, a, 0, 7);
            g.fill();
          }
        }
      }

      // heavy, tightly-spaced type (letterSpacing is skipped where the browser lacks it)
      const setType = (fs: number) => {
        ctx.font = `700 ${fs}px ${fontFamily}`;
        if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${-fs * 0.02}px`;
      };

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

        const face = Math.max(FACE_MIN, Math.min(FACE_MAX, w * 0.075)); // pill height
        const common = { restitution: 0.25, friction: 0.4, frictionAir: 0.012, density: 0.0016 };
        const startY = y ?? -face * 1.4 - Math.random() * 100;
        let body: Matter.Body;

        if (spec.icon) {
          const d = face * 1.3; // icon buttons are round and a bit bigger than a pill is tall
          const style = ICON_STYLE[spec.icon];
          const btn: Btn = { w: d, h: d, bg: style.bg, fg: style.fg, label: "", fs: 0, href: spec.href, icon: spec.icon };
          body = Bodies.circle(d / 2 + Math.random() * Math.max(1, w - d), startY, d / 2, {
            ...common,
            angle: (Math.random() - 0.5) * Math.PI,
            plugin: { btn },
          });
        } else {
          const fs = face * 0.56; // big type for the pill
          setType(fs);
          const bw = Math.ceil(ctx.measureText(spec.label).width + face * 0.95);
          const btn: Btn = { w: bw, h: face, bg: color.bg, fg: color.fg, label: spec.label, fs, href: spec.href };
          body = Bodies.rectangle(bw / 2 + Math.random() * Math.max(1, w - bw), startY, bw, face, {
            ...common,
            chamfer: { radius: face / 2 }, // fully rounded ends = a capsule
            angle: (Math.random() - 0.5) * Math.PI * 0.8,
            plugin: { btn },
          });
        }
        bodies.push(body);
        Composite.add(engine.world, body);
      };

      // ── drawing ────────────────────────────────────────────────────────────────────────────
      const drawIcon = (kind: "chat" | "mail", r: number, color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = r * 0.15;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        if (kind === "chat") {
          const R = r * 0.42;
          const cy = -r * 0.05;
          ctx.arc(0, cy, R, 2.65, 1.95 + Math.PI * 2); // the long way round, leaving a gap for the tail
          ctx.lineTo(-r * 0.42, r * 0.52);
          ctx.closePath();
        } else {
          ctx.lineWidth = r * 0.12;
          ctx.rotate(-0.14);
          ctx.roundRect(-r * 0.46, -r * 0.31, r * 0.92, r * 0.62, r * 0.1);
          ctx.moveTo(-r * 0.42, -r * 0.24);
          ctx.lineTo(0, r * 0.06);
          ctx.lineTo(r * 0.42, -r * 0.24);
        }
        ctx.stroke();
      };

      const draw = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (const body of bodies) {
          const b = info(body);
          ctx.save();
          ctx.translate(body.position.x, body.position.y);
          ctx.rotate(body.angle);

          if (b.icon) {
            const r = b.w / 2;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = b.bg;
            ctx.fill();
            if (b.icon === "chat") {
              ctx.save();
              ctx.clip();
              ctx.drawImage(leopard, -r, -r, r * 2, r * 2);
              ctx.restore();
            }
            drawIcon(b.icon, r, b.fg);
          } else {
            // flat pill, no outline
            ctx.fillStyle = b.bg;
            ctx.beginPath();
            ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, b.h / 2);
            ctx.fill();

            ctx.fillStyle = b.fg;
            setType(b.fs);
            ctx.fillText(b.label, 0, b.fs * 0.03);
          }
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
      <div className={styles.cta_wrapper}>
        <ClipText on="scroll"  delay={0.28} className={styles.cta_title}>
          LET&apos;S WORK <br/>  TOGETHER
        </ClipText>
        </div>
      <canvas ref={canvasRef} className={styles.cta_dsn_canvas} aria-hidden="true" />
    </div>
  );
}
