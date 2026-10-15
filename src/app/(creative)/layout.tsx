"use client";

// src/app/(creative)/layout.tsx
// Everything that only the 3D / creative mode needs. The corporate page never loads any of it.

import "lenis/dist/lenis.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import NoiseModule from "@/components/ui/NoiseModule";
import BackgroundMusic from "@/providers/background-music";
import GlobalClickSound from "@/components/GlobalClickSound";
import TransitionProvider from "@/providers/transition-provider";
import Preloader from "@/components/preloader/Preloader";

export default function CreativeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Preloader />
      <NoiseModule />
      <BackgroundMusic>
        <GlobalClickSound />
        <SmoothScroll>
          <Header />
          <TransitionProvider>{children}</TransitionProvider>
          <div data-landing-gate="" style={{ display: "contents" }}>
            <Footer />
          </div>
        </SmoothScroll>
      </BackgroundMusic>
    </>
  );
}
