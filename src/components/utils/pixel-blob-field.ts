/**
 * Pixelated metaball field on a 2D canvas.
 *
 * Same look as the page transition: chunky blocks, blobs that float, merge and
 * flood the screen as `progress` goes 0 → 1. Here `progress` is scrubbed by
 * the caller (real loading progress) instead of being tweened over time.
 */

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  maxRadius: number;
}

// x / y are fractions of the viewport; reach is a multiple of its longest side.
const SEEDS = [
  { x: 0.15, y: 0.15, vx: 0.4, vy: 0.3, radius: 40, reach: 0.9 },
  { x: 0.8, y: 0.2, vx: -0.3, vy: 0.5, radius: 70, reach: 0.95 },
  { x: 0.2, y: 0.5, vx: 0.5, vy: -0.2, radius: 60, reach: 0.9 },
  { x: 0.65, y: 0.6, vx: -0.4, vy: -0.4, radius: 90, reach: 1.1 },
  { x: 0.3, y: 0.85, vx: 0.3, vy: -0.3, radius: 50, reach: 0.85 },
  { x: 0.75, y: 0.85, vx: -0.2, vy: -0.5, radius: 55, reach: 0.9 },
];

const BASE_THRESHOLD = 14000; // field threshold at rest; falls as progress rises
const DRIFT = 2; // how far the blobs wander while they're still small

/**
 * From this progress on, the blobs have merged into a solid sheet, so we skip
 * the field and fill the screen outright. Measured, not guessed: the field
 * covers 100% of the screen by p ≈ 0.55 on 1440×900, 1920×1080, 2560×1080,
 * 390×844 and 820×1180, so 0.58 leaves a little margin and no visible pop.
 */
export const FIELD_FULL_AT = 0.58;

/**
 * The first holes open just below this (≥99.6% covered at 0.50 everywhere I
 * measured). The reveal starts here, so it doesn't spend its first half
 * second easing through a screen that is still entirely blue.
 */
export const FIELD_NEARLY_FULL = 0.53;

export interface PixelBlobField {
  /** Match the canvas to the viewport (call on window resize, then redraw). */
  resize(): void;
  /** Advance the ambient float. `dt` is in seconds. */
  step(dt: number, progress: number): void;
  /** Paint the field for a progress between 0 and 1. */
  draw(progress: number): void;
}

export function createPixelBlobField(
  canvas: HTMLCanvasElement,
  { color }: { color: string }
): PixelBlobField {
  const ctx = canvas.getContext("2d");

  let width = 0;
  let height = 0;
  let pixel = 16;
  let time = 0;
  let blobs: Blob[] = [];

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const first = blobs.length === 0;
    const sx = width ? w / width : 1;
    const sy = height ? h / height : 1;
    const longest = Math.max(w, h);

    width = canvas.width = w;
    height = canvas.height = h;
    pixel = w < 640 ? 10 : 16;

    if (first) {
      blobs = SEEDS.map((s) => ({
        x: w * s.x,
        y: h * s.y,
        vx: s.vx,
        vy: s.vy,
        baseRadius: s.radius,
        maxRadius: longest * s.reach,
      }));
    } else {
      // Keep the blobs where they were, relative to the new viewport
      blobs.forEach((b, i) => {
        b.x *= sx;
        b.y *= sy;
        b.maxRadius = longest * SEEDS[i].reach;
      });
    }
  };

  const step = (dt: number, progress: number) => {
    time += dt * 1.8;
    if (progress >= 0.5) return; // once they take over the screen, stop wandering
    const k = dt * 60 * DRIFT;
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i];
      b.x += Math.sin(time + i) * b.vx * k;
      b.y += Math.cos(time * 0.8 + i) * b.vy * k;
    }
  };

  const draw = (p: number) => {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (p <= 0) return;

    ctx.fillStyle = color;

    if (p >= FIELD_FULL_AT) {
      ctx.fillRect(0, 0, width, height);
      return;
    }

    // Blobs grow out of nothing over the first 10% instead of popping in
    const grow = Math.min(1, p / 0.1);
    const threshold = BASE_THRESHOLD * (1 - p) + 200 * p;

    // A blob's strength only depends on progress, so work it out once per frame
    const strength = blobs.map((b) => {
      const radius = b.baseRadius * grow + (b.maxRadius - b.baseRadius) * p;
      return radius * radius * 1000;
    });

    const cols = Math.ceil(width / pixel);
    const rows = Math.ceil(height / pixel);
    const half = pixel / 2;

    // One path, one fill. Horizontal runs are merged into a single rect, which
    // is far cheaper than a rect per cell and leaves no seams between blocks.
    ctx.beginPath();
    for (let r = 0; r < rows; r++) {
      const py = r * pixel + half;
      let runStart = -1;

      for (let c = 0; c < cols; c++) {
        const px = c * pixel + half;
        let sum = 0;
        for (let i = 0; i < blobs.length; i++) {
          const dx = px - blobs[i].x;
          const dy = py - blobs[i].y;
          const distSq = dx * dx + dy * dy;
          sum += distSq > 1 ? strength[i] / distSq : 999999;
        }

        if (sum > threshold) {
          if (runStart < 0) runStart = c;
        } else if (runStart >= 0) {
          ctx.rect(runStart * pixel, r * pixel, (c - runStart) * pixel, pixel);
          runStart = -1;
        }
      }

      if (runStart >= 0) {
        ctx.rect(runStart * pixel, r * pixel, (cols - runStart) * pixel, pixel);
      }
    }
    ctx.fill();
  };

  return { resize, step, draw };
}
