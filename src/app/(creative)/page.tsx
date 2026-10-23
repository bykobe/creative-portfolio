//CREATIVE PAGE.TSX

import styles from "../../styles/main.module.css";
import Hero from "@/components/sections/Hero";
import CaseStudies from "@/components/sections/Projects";
import ImpressiveMoments from "@/components/sections/ImpressiveMoments";
import Inspo from "@/components/sections/Inspo";
import CallToAction from "@/components/sections/CallToAction";
import LandingGate, { LandingGateStyles } from "@/components/LandingGate";
import HeroTransition from "@/components/HeroTransition";
import ThreeCanvas from "@/components/ThreeCanvas";
import Showreel from "@/components/sections/Showreel";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <LandingGateStyles />
        <ThreeCanvas />
        <HeroTransition />
        <LandingGate>
          <Hero />
          <Showreel />
          <CaseStudies />
          <ImpressiveMoments />
                    <CallToAction />
          {/*
          <Inspo />

          */}
        </LandingGate>
      </main>
    </div>
  );
}
