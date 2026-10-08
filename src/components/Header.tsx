"use client"

import Button from "./ui/Button";
import styles from "./components.module.css"
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { AnimatePresence, motion } from "motion/react";

export default function Header() {

  const [showMenu, setShowMenu] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  // Close menu when clicking anywhere outside of the menu container
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (!event.target) return;
        const target = event.target as Node;

        if (menuBtnRef.current?.contains(target)) return;

        if (menuRef.current && !menuRef.current.contains(target)) {
          setShowMenu(false);
        }
      };

      if (showMenu) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showMenu]);

  return (
    <header className={styles.header}>
      <nav className={styles.headerNav}>
        <Button ref={menuBtnRef} className={styles.menuBtn} onClick={() => setShowMenu(!showMenu)}>Menu</Button>
      </nav>
      <NavMenu ref={menuRef} isOpen={showMenu} />
    </header>
  )
}

type NavMenuProps = {
  ref: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
}

const NavMenu = ({ ref, isOpen }: NavMenuProps) => {

  return (
    <AnimatePresence>

      <motion.div initial={{scale: 0}} animate={{scale: 1}} exit={{scale: 0}} className={`${styles.navMenuWrapper} ${isOpen ? styles.open : ''}`} ref={ref}>
        <div className={styles.navMenu}>
          <div className={styles.navLinksWrapper}>
            {NavLinks.map(({idx, title, link, download}, i) => {
              return (
                <div key={i} className={styles.navLinkItem}>
                  <a
                    href={link}
                    target="_self"
                    className={styles.navLink}
                    {...(download ? { download } : {})}
                  >
                    <div className={styles.linkContent}>
                      <span className={styles.linkIdx}>0{ idx}</span>
                    <span>
                      {title}
                    </span>
                    </div>
                  </a>
                </div>
            )})}
          </div>
          </div>
     </motion.div>
    </AnimatePresence>
  )
}

type NavLinksTypes = {
  idx: number,
  title: string,
  link: string,
  /** When set, the browser downloads `link` instead of navigating to it. */
  download?: string,
}

const NavLinks:NavLinksTypes[]  = [
  {
    idx: 1 ,
    title: "Home" ,
    link: "/",
  },
  {
    idx: 2 ,
    title: "My Journey" ,
    link: "/my-journey",
  },
  {
    idx: 3 ,
    title: "Projects" ,
    link: "/case-studies",
  },  {
    idx: 4 ,
    title: "Resume" ,
    link: "/resume.pdf",
    download: "Kobe-Tio-Resume.pdf",
  }
]
