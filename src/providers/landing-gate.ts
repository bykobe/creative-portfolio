// src/providers/landing-gate.ts
//
// Shared state between the 3D scene, the transition and the landing page. It is plain
// TypeScript (no React) so the scene's render loop can use it directly.
//
//   phase  "scene": only the 3D scene exists, the landing page is hidden (display: none)
//          "page":  the landing page is live, the canvas is hidden and not rendering
//
// A hand-off goes: begin() -> the transition covers the screen -> commit() flips the phase while
// nothing can be seen -> the transition reveals the other side -> finish() unlocks input.
// The phase is mirrored onto <html data-landing="page"> (absent while the scene is showing),
// which is what LandingGate's CSS keys off.

export type GateDirection = "enter" | "leave";
export type GateEvent = { type: "begin" | "commit" | "finish"; direction: GateDirection };
type Listener = (event: GateEvent) => void;

// If a transition has not finished this long after it began, something in it failed (an error, an
// animation that never ended). The gate then completes it by force so the page can never get stuck
// behind a cover with scrolling blocked.
const WATCHDOG_MS = 6000;
// Logs every step to the console while you work on your own transition
const DEBUG = false;

const listeners = new Set<Listener>();
let watchdog: ReturnType<typeof setTimeout> | undefined;
let overlays = 0; // how many transition overlays are mounted
let phase: "scene" | "page" = "scene";
let busy = false;
let committed = false;
let direction: GateDirection | null = null;

const emit = (type: GateEvent["type"]) => {
  if (!direction) return;
  if (DEBUG) console.debug(`[landing-gate] ${type} (${direction})`);
  for (const listener of [...listeners]) {
    try {
      listener({ type, direction });
    } catch (error) {
      // one broken listener must not stop the others, or the hand-off would never complete
      console.error(`[landing-gate] a listener threw on "${type}":`, error);
    }
  }
};

const mirrorToDocument = () => {
  if (typeof document === "undefined") return;
  if (phase === "page") document.documentElement.dataset.landing = "page";
  else delete document.documentElement.dataset.landing;
};

export const landingGate = {
  get phase() { return phase; },
  /** true from begin() until finish(): a transition is playing and input must be ignored */
  get busy() { return busy; },

  on(listener: Listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },

  /** A transition overlay calls this once on mount. Without one, hand-offs are instant cuts. */
  registerOverlay() {
    overlays++;
    return () => { overlays--; };
  },

  /** Start a hand-off. Returns false if one is already playing or you are already there. */
  begin(next: GateDirection) {
    if (busy) return false;
    if (next === "enter" && phase === "page") return false;
    if (next === "leave" && phase === "scene") return false;
    busy = true;
    committed = false;
    direction = next;
    clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      if (!busy) return;
      console.warn(
        `[landing-gate] the "${direction}" transition hadn't finished after ${WATCHDOG_MS} ms ` +
        `(committed: ${committed}). Forcing it to complete. Your transition must call ` +
        `landingGate.commit() once the screen is covered and landingGate.finish() when it is done.`
      );
      landingGate.commit();
      landingGate.finish();
    }, WATCHDOG_MS);
    emit("begin");
    if (overlays === 0) { landingGate.commit(); landingGate.finish(); }
    return true;
  },

  /** The transition has fully covered the screen: swap what is underneath. Call once. */
  commit() {
    if (!busy || committed || !direction) return;
    committed = true;
    phase = direction === "enter" ? "page" : "scene";
    mirrorToDocument();
    emit("commit");
  },

  /** The transition has finished revealing: input works again. */
  finish() {
    if (!busy) return;
    clearTimeout(watchdog);
    emit("finish");
    busy = false;
    direction = null;
  },

  /** Show the landing page right away, no transition (the scene can't run: WebGL or model failed). */
  skip() {
    if (phase === "page") return;
    direction = "enter";
    phase = "page";
    mirrorToDocument();
    emit("commit");
    direction = null;
    busy = false;
  },

  /** Back to the starting state. The scene calls this when it unmounts. */
  reset() {
    clearTimeout(watchdog);
    phase = "scene";
    busy = false;
    committed = false;
    direction = null;
    mirrorToDocument();
  },
};
