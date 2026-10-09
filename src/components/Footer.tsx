"use client";

import { useSound } from "./hooks/useSound";

import Link from "next/link"
import styles from "./components.module.css"
import { ASTERISK, contact, navigation } from "./ui/assets"
import FooterMark from "./ui/svgs/FooterMark"

export default function Footer() {

  const click = useSound('/audio/mouse-clicks.mp3');

  return (
    <footer className={styles.footer}>
      <div className={styles.footer_body}>
        <div className={styles.footer_body_ts}>
          <div className={styles.contact_wrapper}>
            <div className={styles.contact_item_title}>
              <h4 className="heading4">Contact</h4>
            </div>
            <ul className={styles.contact_item_group}>
              {contact.map(({name, link}, idx) => {
                return (
                  <li className={styles.contact_item} key={idx}>
                    <Link href={link} onClick={click}>
                      <span className="paragraph1">{name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className={styles.nav_wrapper}>

            <div className={styles.nav_item_title}>
              <h4 className="heading4">Navigation</h4>
            </div>
            <ul className={styles.nav_item_group}>
              {navigation.map(({name, link}, idx) => {
                return (
                  <li className={styles.nav_item} key={idx}>
                    <Link href={link} onClick={click}>
                      <span className="paragraph1">{name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>

          </div>
          <div className={styles.credits_wrapper}>
            <span className="paragraph4">Designed & Developed by Kobe</span>
            <span className="paragraph4">Accra, Ghana | EU Remote (CET)</span>
          </div>
        </div>

        <div className={styles.footer_body_ms}>
          <span className="paragraph4">COPYRIGHT 2026</span>
          <div className={styles.asterisk_container}>
            <ASTERISK />
          </div>
        </div>

        <div className={styles.footer_body_bs}>
          <FooterMark />
        </div>
      </div>
    </footer>
  )
}
