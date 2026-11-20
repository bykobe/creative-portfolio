import PixelScroll from "../pixel-scroll/pixel-scroll";
import styles from "./CallToAction.module.css";
import CapsuleScene from "./CapsuleScene";


export default function CallToAction() {
  return (
    <>
      <PixelScroll height="100vh" pixelSize={55} scrollDistance={40} className={styles.pixel_scroll} />
      <CapsuleScene />
      <div  className="bg-black h-5 w-full"/>
    </>
  );
}
