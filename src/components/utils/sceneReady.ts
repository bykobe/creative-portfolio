import type { Camera, Object3D, Scene, WebGLRenderer } from "three";
import { preloader } from "../hooks/preloaderStore";

// A frame counts as smooth under this many seconds (about 22fps)...
const SMOOTH_DELTA = 0.045;
// ...and we want this many in a row before the cover is allowed to open,
const SMOOTH_FRAMES_NEEDED = 3;
// but never wait longer than this many frames, or this long, after the shaders are compiled
// (a weak GPU may never produce smooth frames, and shouldn't hold the cover up for it).
const MAX_FRAMES_TO_WAIT = 240;
const MAX_SETTLE_MS = 2500;

// compileAsync needs three r158+. Fall back to the blocking compile if it's missing.
type MaybeAsyncRenderer = {
  compileAsync?: (scene: Object3D, camera: Camera) => Promise<unknown>;
};

/**
 * Tells the preloader when a plain three.js scene is genuinely ready to be looked at,
 * not just downloaded.
 *
 *   const ready = createReadyTracker(renderer, scene, camera);
 *   ready.start();   // once everything is in the scene (model placed, textures applied)
 *   ready.frame();   // every frame, right after renderer.render(...)
 *   ready.cancel();  // in your cleanup
 *
 * After start(), every shader is compiled without blocking the main thread, then a few
 * smooth frames are rendered, and only then does the preloader's cover get permission to open.
 * The canvas keeps rendering underneath the cover the whole time, so the first-frame stall
 * (texture uploads, shadow maps) happens where nobody can see it.
 */
export function createReadyTracker(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera
) {
  let started = false;
  let compiled = false;
  let reported = false;
  let cancelled = false;
  let seen = 0;
  let smooth = 0;
  let compiledAt = 0;
  let last = performance.now();

  return {
    start() {
      if (started || cancelled) return;
      started = true;

      const r = renderer as WebGLRenderer & MaybeAsyncRenderer;
      const job = r.compileAsync
        ? r.compileAsync(scene, camera)
        : Promise.resolve(renderer.compile(scene, camera));

      job
        .catch(() => {
          /* a failed precompile just means shaders compile on the first draw */
        })
        .then(() => {
          if (cancelled) return;
          compiled = true;
          compiledAt = performance.now();
        });
    },

    frame() {
      const now = performance.now();
      const delta = (now - last) / 1000;
      last = now;
      if (!compiled || reported || cancelled) return;

      seen += 1;
      smooth = delta < SMOOTH_DELTA ? smooth + 1 : 0;

      if (
        smooth >= SMOOTH_FRAMES_NEEDED ||
        seen >= MAX_FRAMES_TO_WAIT ||
        now - compiledAt >= MAX_SETTLE_MS
      ) {
        reported = true;
        preloader.markSceneReady();
      }
    },

    cancel() {
      cancelled = true;
    },
  };
}
