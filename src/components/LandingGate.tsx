// src/components/LandingGate.tsx
//
// Holds the landing page hostage: while the 3D scene is showing, everything inside <LandingGate>
// is display: none, so the document has no height and nothing can scroll underneath the canvas.
// When the scene hands off (landing-gate.ts sets <html data-landing="page">) it appears.
//
// It is a server component with no state: the hiding is plain CSS, so the very first paint is
// already correct (no flash of the page before the scene mounts) and the content is still in the
// HTML for crawlers. display: contents makes the wrapper invisible to layout, so your sections lay
// out exactly as before. (If your CSS uses child combinators like `main > section`, put the
// data-landing-gate attribute on the sections themselves instead of wrapping them.)
import type { ReactNode } from "react";

export function LandingGateStyles() {
  return (
    <>
      <style>{`[data-landing-gate]{display:none!important}html[data-landing="page"] [data-landing-gate]{display:contents!important}`}</style>
      {/* without JavaScript there is no scene to hand off from: just show the page */}
      <noscript><style>{`[data-landing-gate]{display:contents!important}`}</style></noscript>
    </>
  );
}

export default function LandingGate({ children }: { children: ReactNode }) {
  return <div data-landing-gate="">{children}</div>;
}
