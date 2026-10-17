"use client";

// src/app/corporate/layout.tsx
// Nothing here is heavy: the page transition lives in the root layout (so it survives the switch
// between the creative and corporate sides), and the preloader, music, smooth scroll, header
// and footer all belong to (creative).
import { useEffect } from "react";
import { bootState } from "@/providers/boot-state";

export default function CorporateLayout({ children }: { children: React.ReactNode }) {
  // Remember that this tab has been on the corporate side. The creative layout reads this to
  // skip its preloader when you come back by clicking "View Creative Version".
  useEffect(() => {
    bootState.visitedCorporate = true;
  }, []);

  return <>{children}</>;
}
