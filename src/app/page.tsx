import styles from "../styles/main.module.css";

import Hero from "@/components/sections/Hero";
import Spotlight from "@/components/sections/Spotlight";
import About from "@/components/sections/About";
import CaseStudies from "@/components/sections/Projects";
import ImpressiveMoments from "@/components/sections/ImpressiveMoments";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Hero />
        <Spotlight />
        <About />
        <CaseStudies />
        <ImpressiveMoments />
      </main>
    </div>
  );
}
