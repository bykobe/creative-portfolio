"use client";

// src/app/(creative)/layout.tsx

import "lenis/dist/lenis.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import BackgroundMusic from "@/providers/background-music";
import GlobalClickSound from "@/components/GlobalClickSound";
import Preloader from "@/components/preloader/Preloader";
import { bootState } from "@/providers/boot-state";

export default function CreativeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {!bootState.visitedCorporate && <Preloader />}
    {/*  <NoiseModule /> */}
      <BackgroundMusic>
        <GlobalClickSound />
        <SmoothScroll>
          <Header />
          {children}
          <div data-landing-gate="" style={{ display: "contents" }}>
            <Footer />
          </div>
        </SmoothScroll>
      </BackgroundMusic>
    </>
  );
}
