"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import type { Camera, Object3D } from "three";
import { preloader } from "../hooks/preloaderStore";

// Assets count as finished once the loader has been idle this long. That gives
// React time to mount whatever Suspense just resolved, which can start more loads.
const SETTLE_MS = 350;
// Nothing ever went through three's loading manager (a procedural scene): stop waiting.
const NOTHING_TO_LOAD_MS = 2500;
// A frame counts as smooth under this many seconds (about 22fps)...
const SMOOTH_DELTA = 0.045;
// ...and we want this many in a row before opening the cover,
const SMOOTH_FRAMES_NEEDED = 3;
// but never wait longer than this many frames.
const MAX_FRAMES_TO_WAIT = 240;

// compileAsync needs three r158+. Fall back to the blocking compile if it's missing.
type MaybeAsyncRenderer = {
  compileAsync?: (scene: Object3D, camera: Camera) => Promise<unknown>;
};

/**
 * Tells the preloader what the scene is really doing.
 *
 * Put it INSIDE <Canvas>, but OUTSIDE the <Suspense> that wraps your models:
 *
 *   <Canvas>
 *     <PreloaderBridge />
 *     <Suspense fallback={null}>
 *       <Scene />
 *     </Suspense>
 *   </Canvas>
 *
 * 1. Forwards drei's loading progress (textures, GLTFs, anything three loads).
 * 2. Once loading has gone quiet, compiles every shader without blocking the
 *    main thread.
 * 3. Waits for a few smooth frames, so the first frame of the reveal isn't a hitch.
 * 4. Only then marks the scene ready, and the cover starts to open.
 *
 * Works with frameloop="demand" too: it asks for frames while it's waiting.
 */
export default function PreloaderBridge() {
  const { progress, active, total } = useProgress();
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  const [assetsDone, setAssetsDone] = useState(false);
  const compiled = useRef(false);
  const reported = useRef(false);
  const seen = useRef(0);
  const smooth = useRef(0);

  // Real download progress goes straight to the counter
  useEffect(() => {
    preloader.setAssets(progress);
  }, [progress]);

  // 100% and quiet for a moment → everything that's going to load has loaded
  useEffect(() => {
    if (progress < 100 || active) return;
    const id = window.setTimeout(() => setAssetsDone(true), SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [progress, active]);

  // Procedural scene: nothing will ever report, so don't wait for it
  useEffect(() => {
    if (total > 0) return;
    const id = window.setTimeout(() => setAssetsDone(true), NOTHING_TO_LOAD_MS);
    return () => window.clearTimeout(id);
  }, [total]);

  useEffect(() => {
    if (!assetsDone) return;
    preloader.setAssets(100);

    let cancelled = false;
    const renderer = gl as typeof gl & MaybeAsyncRenderer;
    const job = renderer.compileAsync
      ? renderer.compileAsync(scene, camera)
      : Promise.resolve(gl.compile(scene, camera));

    job
      .catch(() => {
        /* a failed precompile just means shaders compile on the first draw */
      })
      .then(() => {
        if (cancelled) return;
        compiled.current = true;
        invalidate(); // kick a frame in case the Canvas is frameloop="demand"
      });

    return () => {
      cancelled = true;
    };
  }, [assetsDone, gl, scene, camera, invalidate]);

  useFrame((_, delta) => {
    if (!compiled.current || reported.current) return;

    seen.current += 1;
    smooth.current = delta < SMOOTH_DELTA ? smooth.current + 1 : 0;

    if (
      smooth.current >= SMOOTH_FRAMES_NEEDED ||
      seen.current >= MAX_FRAMES_TO_WAIT
    ) {
      reported.current = true;
      preloader.markSceneReady();
      return;
    }

    invalidate();
  });

  return null;
}
