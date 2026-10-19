"use client";

// src/components/ui/svgs/NameMark.tsx
// The KOBE TIO* wordmark. Each letter is a real SVG <path> that is also a Matter.js body.
//
//   Entrance:  when the landing page is revealed (the hand-off from the 3D scene has finished) the
//              letters drop in from above, TIO* first, then KOBE on top of it. They land, collide
//              and bounce off each other...
//   Magnet:    ...and then a magnetic pull ramps up and springs each one back into its slot, with an
//              overshoot and a wobble on the way.
//   Drag:      grab any letter with the mouse and throw it around; on release it springs home again.
//
// The physics runs in the SVG's own coordinate system (the 809 x 478 viewBox), so it scales with the
// wordmark and needs no resize handling. It only runs while the wordmark is on screen.

import { useEffect, useRef } from "react";
import type { Body as MatterBody, Constraint as MatterConstraint } from "matter-js";
import { landingGate } from "@/providers/landing-gate";

// ── Tweakables ──────────────────────────────────────────────────────────────────────────────
const GRAVITY = 2.4; //            how hard they fall (before the magnet takes over)
const BOUNCE = 0.5; //             0 = thud, 1 = rubber ball
const MAGNET_DELAY_MS = 1900; //   when the pull starts, counted from the first letter dropping
const MAGNET_RAMP_MS = 800; //     how long it takes to reach full strength
const PULL = 0.012; //             spring strength towards the slot
const PULL_DAMPING = 0.1; //       lower = more wobble / overshoot, higher = a calm settle
const TWIST = 0.012; //            spring strength back to upright
const TWIST_DAMPING = 0.12;
const DRAG_PULL = 0.4; //          how much of the pull is left while you hold a letter (1 = full)
// when each letter drops, in ms. Order: K O B E / T I O *   (TIO* goes first so KOBE lands on it)
const DROP_AT_MS = [650, 770, 890, 1010, 0, 120, 240, 360];

// ── Geometry, in viewBox units ([x, y, width, height] of each letter) ───────────────────────
// K, B, E, I are boxes; the two O's and the asterisk are circles; the T is a bar plus a stem.
const BOXES: Record<number, [number, number, number, number]> = {
  0: [1.6, 3.1, 200.5, 215.6], // K
  2: [423.8, 3.1, 211.2, 215.6], // B
  3: [642.7, 3.1, 166.3, 215.6], // E
  5: [177.2, 259.3, 86.2, 215.6], // I
};
const CIRCLES: Record<number, [number, number, number]> = {
  1: [308.1, 110.9, 109.3], // first O: centre x, centre y, radius
  6: [379.1, 367.1, 109.3], // second O
  7: [564, 323, 63], //          the asterisk
};
const TEE = {
  bar: [-3, 259.3, 172.4, 138.6],
  stem: [40.1, 397.9, 86.2, 77],
} as const;

const VIEW_W = 809;
const FLOOR_Y = 478;

export default function NameMark({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>("path[data-letter]"));
    if (paths.length !== 8) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return; // letters simply stay in their slots

    const canDrag = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const setCursor = (c: string) => paths.forEach((p) => (p.style.cursor = c));
    if (canDrag) setCursor("grab");
    const PARKED = "translate(0 -1600)"; // far above the screen, until a letter's turn to drop

    let disposed = false;
    let stopWorld: () => void = () => {};
    let visible = false;
    let resume: () => void = () => {};
    let suspend: () => void = () => {};

    // Matter is loaded right away (the page is still hidden behind the 3D scene), so the drop is instant
    const matterReady = import("matter-js").then((m) => m.default);

    // Keep the letters out of sight while the landing page is hidden, so nothing flashes at reveal
    if (landingGate.phase !== "page") paths.forEach((p) => p.setAttribute("transform", PARKED));

    const drop = async () => {
      let Matter: typeof import("matter-js");
      try {
        Matter = await matterReady;
      } catch {
        paths.forEach((p) => p.removeAttribute("transform")); // no physics: show the wordmark as is
        return;
      }
      if (disposed) return;
      stopWorld(); // a previous run, if the page was entered before
      const { Engine, Bodies, Body, Composite, Constraint } = Matter;

      const engine = Engine.create();
      engine.gravity.y = GRAVITY;
      const world = engine.world;

      // the floor sits on the bottom of the wordmark; walls keep the letters near their slots
      const wall = { isStatic: true, friction: 0.4 };
      Composite.add(world, [
        Bodies.rectangle(VIEW_W / 2, FLOOR_Y + 100, VIEW_W + 1200, 200, wall),
        Bodies.rectangle(-160, 0, 200, 4000, wall),
        Bodies.rectangle(VIEW_W + 160, 0, 200, 4000, wall),
      ]);

      // ── one body per letter, built in its slot so its home is wherever it ends up ─────────────
      const options = (i: number) => ({
        restitution: BOUNCE,
        friction: 0.35,
        frictionAir: 0.008,
        density: 0.002,
        label: `letter-${i}`,
      });
      const make = (i: number): MatterBody => {
        if (i in BOXES) {
          const [x, y, w, h] = BOXES[i];
          return Bodies.rectangle(x + w / 2, y + h / 2, w, h, { ...options(i), chamfer: { radius: 12 } });
        }
        if (i in CIRCLES) {
          const [cx, cy, r] = CIRCLES[i];
          return Bodies.circle(cx, cy, r, options(i), 40);
        }
        const [bx, by, bw, bh] = TEE.bar;
        const [sx, sy, sw, sh] = TEE.stem;
        const bar = Bodies.rectangle(bx + bw / 2, by + bh / 2, bw, bh, { chamfer: { radius: 10 } });
        const stem = Bodies.rectangle(sx + sw / 2, sy + sh / 2, sw, sh, { chamfer: { radius: 10 } });
        return Body.create({ parts: [bar, stem], ...options(i) });
      };

      const letters = paths.map((_, i) => {
        const body = make(i);
        return { body, home: { x: body.position.x, y: body.position.y }, added: false };
      });
      paths.forEach((p) => p.setAttribute("transform", PARKED));

      // ── schedule the drops ────────────────────────────────────────────────────────────────
      const t0 = performance.now();
      const timers: number[] = letters.map((l, i) =>
        window.setTimeout(() => {
          const { body, home } = l;
          // appear above the wordmark, roughly over its own slot, tilted
          const above = -(120 + Math.random() * 120) - (i < 4 ? 120 : 0);
          Body.setPosition(body, { x: home.x + (Math.random() - 0.5) * 90, y: above });
          Body.setAngle(body, (Math.random() - 0.5) * 1.2);
          Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08);
          Composite.add(world, body);
          l.added = true;
        }, DROP_AT_MS[i]),
      );

      // ── the magnet: a damped spring towards the slot, strength ramping up after the landing ──
      let dragged: MatterBody | null = null;
      const strength = () => {
        const t = performance.now() - t0 - MAGNET_DELAY_MS;
        const k = Math.min(1, Math.max(0, t / MAGNET_RAMP_MS));
        return k * k * (3 - 2 * k); // smoothstep
      };
      const onBeforeUpdate = () => {
        const m = strength();
        engine.gravity.y = GRAVITY * (1 - m);
        if (m <= 0) return;
        for (const { body, home, added } of letters) {
          if (!added) continue;
          const f = body === dragged ? m * DRAG_PULL : m;
          const v = body.velocity;
          Body.setVelocity(body, {
            x: v.x + (PULL * (home.x - body.position.x) - PULL_DAMPING * v.x) * f,
            y: v.y + (PULL * (home.y - body.position.y) - PULL_DAMPING * v.y) * f,
          });
          // wrap the angle so it takes the short way round to upright
          const a = Math.atan2(Math.sin(body.angle), Math.cos(body.angle));
          Body.setAngularVelocity(body, body.angularVelocity + (-TWIST * a - TWIST_DAMPING * body.angularVelocity) * f);
        }
      };
      Matter.Events.on(engine, "beforeUpdate", onBeforeUpdate);

      // ── draw: turn each body's pose into an SVG transform ─────────────────────────────────
      const render = () => {
        letters.forEach(({ body, home, added }, i) => {
          if (!added) return;
          const dx = body.position.x - home.x;
          const dy = body.position.y - home.y;
          const deg = (body.angle * 180) / Math.PI;
          paths[i].setAttribute(
            "transform",
            `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${deg.toFixed(2)} ${home.x.toFixed(2)} ${home.y.toFixed(2)})`,
          );
        });
      };

      // ── the loop: only while the wordmark is on screen ────────────────────────────────────
      let raf = 0;
      let last = 0;
      const frame = (t: number) => {
        raf = requestAnimationFrame(frame);
        Engine.update(engine, Math.min(t - last || 16.7, 32));
        last = t;
        render();
      };
      resume = () => {
        if (!raf) {
          last = 0;
          raf = requestAnimationFrame(frame);
        }
      };
      suspend = () => {
        cancelAnimationFrame(raf);
        raf = 0;
      };
      if (visible) resume();

      // ── dragging ──────────────────────────────────────────────────────────────────────────
      let grab: MatterConstraint | null = null;
      let removeDrag = () => {};
      if (canDrag) {
        const toUser = (e: PointerEvent) => {
          const m = svg.getScreenCTM();
          if (!m) return { x: 0, y: 0 };
          const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
          return { x: p.x, y: p.y };
        };
        const onDown = (e: PointerEvent) => {
          if (e.button !== 0 || e.pointerType === "touch") return;
          const target = (e.target as Element).closest("path[data-letter]");
          if (!target) return;
          const l = letters[Number(target.getAttribute("data-letter"))];
          if (!l?.added) return;
          e.preventDefault();
          svg.setPointerCapture(e.pointerId);
          const p = toUser(e);
          dragged = l.body;
          grab = Constraint.create({
            pointA: p,
            bodyB: l.body,
            pointB: { x: p.x - l.body.position.x, y: p.y - l.body.position.y },
            stiffness: 0.18,
            damping: 0.08,
            length: 0,
          });
          // keep the grab point fixed to the letter as it turns (not in Matter's typings)
          Object.assign(grab, { angleB: l.body.angle });
          Composite.add(world, grab);
          setCursor("grabbing");
        };
        const onMove = (e: PointerEvent) => {
          if (grab) grab.pointA = toUser(e);
        };
        const onUp = (e: PointerEvent) => {
          if (!grab) return;
          Composite.remove(world, grab);
          grab = null;
          dragged = null;
          setCursor("grab");
          if (svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
        };
        svg.addEventListener("pointerdown", onDown);
        svg.addEventListener("pointermove", onMove);
        svg.addEventListener("pointerup", onUp);
        svg.addEventListener("pointercancel", onUp);
        removeDrag = () => {
          svg.removeEventListener("pointerdown", onDown);
          svg.removeEventListener("pointermove", onMove);
          svg.removeEventListener("pointerup", onUp);
          svg.removeEventListener("pointercancel", onUp);
        };
      }

      stopWorld = () => {
        timers.forEach((t) => window.clearTimeout(t));
        suspend();
        removeDrag();
        Matter.Events.off(engine, "beforeUpdate", onBeforeUpdate);
        Composite.clear(world, false);
        Engine.clear(engine);
        stopWorld = () => {};
      };
    };

    // ── when to drop: the moment the landing page has been revealed ─────────────────────────
    // (landing-gate emits "finish" when the hand-off animation is over; "commit" without a
    //  transition in progress is the instant cut used when the 3D scene is skipped)
    const unsubscribe = landingGate.on((e) => {
      if (e.direction !== "enter") return;
      if (e.type === "finish" || (e.type === "commit" && !landingGate.busy)) void drop();
    });
    if (landingGate.phase === "page" && !landingGate.busy) void drop(); // already on the page

    // pause the loop while the wordmark is hidden or scrolled away
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) resume();
      else suspend();
    });
    io.observe(svg);

    return () => {
      disposed = true;
      unsubscribe();
      io.disconnect();
      stopWorld();
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox="0 0 809 478"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Kobe Tio"
      // letters fall in from above the wordmark, so nothing may be clipped
      style={{ overflow: "visible" }}
    >
        <path key="K" data-letter={0} d="M97.6905 63.1379L107.544 12.0116C108.776 5.8518 112.471 3.07989 118.629 3.07989H192.838C198.997 3.07989 200.844 5.8518 198.689 11.7036L166.357 96.0928C164.202 101.637 165.741 105.332 171.592 108.412C190.991 118.884 201.152 140.135 202.076 209.433C202.076 215.593 198.997 218.673 192.531 218.673H112.471C106.312 218.673 103.849 215.593 104.465 209.433C107.544 184.794 106.312 160.771 99.846 149.375C98.3064 146.603 96.7667 144.447 92.7638 144.447C89.0687 144.447 87.5291 147.219 87.5291 152.455L87.837 209.433C87.837 215.593 84.7578 218.673 78.5993 218.673H10.8565C4.69805 218.673 1.61883 215.593 1.61883 209.433V12.3196C1.61883 6.15979 4.69805 3.07989 10.8565 3.07989H78.5993C84.7578 3.07989 87.837 6.15979 87.837 12.3196V63.1379C87.837 65.2938 88.4529 68.6817 91.84 68.6817C96.1509 68.6817 97.3826 65.2938 97.6905 63.1379Z" fill="#000000" />
        <path key="O" data-letter={1} d="M198.809 110.876C198.809 34.4948 244.382 0 308.122 0C371.861 0 417.434 34.4948 417.434 110.876C417.434 187.566 371.861 221.753 308.122 221.753C244.382 221.753 198.809 187.566 198.809 110.876ZM286.567 110.568C286.567 127.816 295.805 135.515 308.122 135.515C320.438 135.515 329.676 127.816 329.676 110.568C329.676 93.9369 320.438 86.2371 308.122 86.2371C295.805 86.2371 286.567 93.9369 286.567 110.568Z" fill="#000000" />
        <path key="B" data-letter={2} d="M433.046 3.07989H538.048C597.785 3.07989 631.964 21.8673 631.964 64.6778C631.964 82.2332 623.958 96.0928 608.254 105.332C605.175 107.18 604.559 108.72 604.559 110.568C604.559 112.724 605.175 114.264 608.562 116.112C626.114 125.66 635.043 139.211 635.043 157.075C635.043 199.885 597.785 218.673 538.048 218.673H433.046C426.888 218.673 423.809 215.593 423.809 209.433V12.3196C423.809 6.15979 426.888 3.07989 433.046 3.07989ZM517.725 95.4768H534.969C541.435 95.4768 544.206 91.4729 544.206 87.4691C544.206 83.7732 541.435 80.0773 534.969 80.0773H517.725C512.49 80.0773 510.027 82.5412 510.027 87.7771C510.027 93.0129 512.49 95.4768 517.725 95.4768ZM517.725 141.675H538.048C544.514 141.675 547.286 137.979 547.286 134.284C547.286 130.28 544.514 126.276 538.048 126.276H517.725C512.49 126.276 510.027 128.74 510.027 133.976C510.027 139.211 512.49 141.675 517.725 141.675Z" fill="#000000" />
        <path key="E" data-letter={3} d="M790.525 138.595H736.638C731.404 138.595 728.94 141.059 728.94 146.295C728.94 151.531 731.404 153.995 736.638 153.995H799.762C805.921 153.995 809 157.075 809 163.235V209.433C809 215.593 805.921 218.673 799.762 218.673H651.96C645.801 218.673 642.722 215.593 642.722 209.433V12.3196C642.722 6.15979 645.801 3.07989 651.96 3.07989H799.762C805.921 3.07989 809 6.15979 809 12.3196V58.518C809 64.6778 805.921 67.7577 799.762 67.7577H736.638C731.404 67.7577 728.94 70.2217 728.94 75.4575C728.94 80.6933 731.404 83.1572 736.638 83.1572H790.525C796.683 83.1572 799.762 86.2371 799.762 92.3969V129.356C799.762 135.515 796.683 138.595 790.525 138.595Z" fill="#000000" />
        <path key="T" data-letter={4} d="M160.199 397.923H137.72C130.022 397.923 126.327 401.619 126.327 409.318V465.68C126.327 471.84 123.248 474.92 117.09 474.92H49.3468C43.1883 474.92 40.1091 471.84 40.1091 465.68V409.318C40.1091 401.619 36.414 397.923 28.716 397.923H6.23766C0.0792208 397.923 -3 394.843 -3 388.683V268.567C-3 262.407 0.0792208 259.327 6.23766 259.327H160.199C166.357 259.327 169.436 262.407 169.436 268.567V388.683C169.436 394.843 166.357 397.923 160.199 397.923Z" fill="#000000" />
        <path key="I" data-letter={5} d="M177.231 465.68V268.567C177.231 262.407 180.31 259.327 186.468 259.327H254.211C260.37 259.327 263.449 262.407 263.449 268.567V465.68C263.449 471.84 260.37 474.92 254.211 474.92H186.468C180.31 474.92 177.231 471.84 177.231 465.68Z" fill="#000000" />
        <path key="O2" data-letter={6} d="M269.776 367.124C269.776 290.742 315.348 256.247 379.088 256.247C442.828 256.247 488.4 290.742 488.4 367.124C488.4 443.813 442.828 478 379.088 478C315.348 478 269.776 443.813 269.776 367.124ZM357.533 366.816C357.533 384.063 366.771 391.763 379.088 391.763C391.405 391.763 400.642 384.063 400.642 366.816C400.642 350.184 391.405 342.485 379.088 342.485C366.771 342.485 357.533 350.184 357.533 366.816Z" fill="#000000" />
        <path key="star" data-letter={7} d="M585.54 265.179L577.534 297.518C576.61 300.906 577.226 302.446 578.15 303.37C579.382 304.602 580.921 303.986 583.693 301.83L611.713 280.887C615.101 278.115 617.256 279.039 618.796 283.043L631.112 314.457C632.652 318.461 631.112 320.617 627.109 321.233L591.698 327.085C588.619 327.701 587.695 328.625 587.388 329.857C587.08 331.397 587.08 333.553 589.543 335.093L619.411 355.728C623.107 358.192 622.799 360.656 619.719 363.428L593.546 384.987C590.467 387.759 588.003 387.143 586.156 383.447L569.836 352.34C567.988 348.952 566.757 347.72 563.986 347.72C561.214 347.72 559.983 348.952 558.135 352.34L541.815 383.447C539.968 387.143 537.504 387.759 534.425 384.987L508.252 363.428C505.172 360.656 504.864 358.192 508.56 355.728L538.428 335.093C540.891 333.553 540.891 331.397 540.583 329.857C540.276 328.625 539.352 327.701 536.273 327.085L500.861 321.233C496.858 320.617 495.319 318.461 496.858 314.457L509.175 283.043C510.715 279.039 512.87 278.115 516.258 280.887L544.279 301.83C546.434 303.37 548.897 304.294 550.129 303.062C551.053 302.138 551.361 300.906 550.437 297.518L542.431 265.179C541.507 261.175 543.047 259.327 547.05 259.327H580.921C584.924 259.327 586.464 261.175 585.54 265.179Z" fill="#000000" />
    </svg>
  );
}
