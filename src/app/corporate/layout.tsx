"use client";

// src/app/corporate/layout.tsx
// Shared by every page under /corporate (the one-pager and /corporate/case-study/[slug]).
// A layout stays mounted while you move between those pages, so the TransitionProvider lives
// across the navigation and can play its transition between them. Nothing creative-only is
// loaded here: no preloader, music, smooth scroll, header or footer.
import { useEffect } from "react";
import TransitionProvider from "@/providers/transition-provider";
import { bootState } from "@/providers/boot-state";

export default function CorporateLayout({ children }: { children: React.ReactNode }) {
  // Remember that this tab has been on the corporate side. The creative layout reads this to
  // skip its preloader when you come back by clicking "View Creative Version".
  useEffect(() => {
    bootState.visitedCorporate = true;
  }, []);

  return <TransitionProvider>{children}</TransitionProvider>;
}
