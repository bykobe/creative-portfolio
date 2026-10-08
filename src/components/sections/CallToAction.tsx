import styles from "./CallToAction.module.css"
import CTA from "../ui/CallToAction";
import ButtonLink from "../ui/ButtonLink";
import Image from "next/image";
import { wonky3 } from "../ui/assets";

export default function CallToAction() {
  return (
    <section className={styles.cta_wrapper}>
      <Image src={wonky3} width={1000} height={1000} alt="background"  className={styles.cta_bg} />
      <ButtonLink className={styles.cta_link} href="/">
        <CTA />
      </ButtonLink>
    </section>
  );
}
