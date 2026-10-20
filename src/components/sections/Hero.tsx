import NameMark from '../ui/svgs/NameMark'
import styles from './Hero.module.css'
import ClipText from '../ui/ClipText'

export default function Hero() {
  return (
    <>
      <div className={styles.heroWrapper}>
        <div className={styles.heroBody}>
          <div className={styles.nameMark}>
            <NameMark className={styles.nameMarkSvg} />
          </div>
          <div className={styles.heroContent}>
          <div className={styles.heroDesc}>
              <ClipText as="p" on="load" delay={0.4} className={styles.heroDescText}>
                Welcome to my chaotic yet creative world.
                I design cool sh*t with personality.
              </ClipText>
          </div>
          <div className={styles.scrollIndicator}>
            <ClipText as="span" on="load" delay={0.43}>Scroll down</ClipText>
            </div>
          </div>

        </div>

      </div>
    </>
  )
}
