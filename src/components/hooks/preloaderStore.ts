import { useSyncExternalStore } from "react";

/**
 * Tiny dependency-free store that connects "the 3D scene is loading" to
 * "the preloader is showing". Your scene writes to it, the preloader reads it.
 *
 *   preloader.setAssets(0–100)   → how much of the scene has downloaded
 *   preloader.markSceneReady()   → shaders compiled + first frames rendered
 *   usePreloaderPhase()          → "loading" | "revealing" | "done" (for camera intros)
 */

export type PreloaderPhase = "loading" | "revealing" | "done";

interface PreloaderState {
  /** 0–100: how much of the scene's assets have loaded. */
  assets: number;
  /** True once the scene has compiled its shaders and rendered a few frames. */
  sceneReady: boolean;
  phase: PreloaderPhase;
}

const INITIAL: PreloaderState = {
  assets: 0,
  sceneReady: false,
  phase: "loading",
};

let state: PreloaderState = INITIAL;
const listeners = new Set<() => void>();

function update(patch: Partial<PreloaderState>) {
  const next = { ...state, ...patch };
  if (
    next.assets === state.assets &&
    next.sceneReady === state.sceneReady &&
    next.phase === state.phase
  ) {
    return;
  }
  state = next;
  listeners.forEach((listener) => listener());
}

export const preloader = {
  getState: () => state,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Only ever moves forward, so a late lazy-load can't rewind the counter. */
  setAssets: (percent: number) =>
    update({ assets: Math.max(state.assets, Math.min(100, percent)) }),

  markSceneReady: () => update({ sceneReady: true }),

  setPhase: (phase: PreloaderPhase) => update({ phase }),

  /** Handy for dev / HMR. */
  reset: () => update(INITIAL),
};

/** Re-renders when the preloader changes phase. Use it to trigger a camera intro. */
export function usePreloaderPhase(): PreloaderPhase {
  return useSyncExternalStore(
    preloader.subscribe,
    () => state.phase,
    () => "loading" as const
  );
}
