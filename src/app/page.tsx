import styles from "../styles/main.module.css";

import Hero from "@/components/sections/Hero";
import Spotlight from "@/components/sections/Spotlight";
import About from "@/components/sections/About";
import CaseStudies from "@/components/sections/Projects";
import ImpressiveMoments from "@/components/sections/ImpressiveMoments";
import Inspo from "@/components/sections/Inspo";
import CallToAction from "@/components/sections/CallToAction";
import Scene from "@/components/Scene";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
           <Scene />
        <Hero />
        <Spotlight />
        <About />
        <CaseStudies />
        <ImpressiveMoments />
        <Inspo />
        <CallToAction />

      </main>
    </div>
  );
}
