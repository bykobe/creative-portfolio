"use client"

import Button from "./ui/Button";
import styles from "./components.module.css"
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { motion } from "motion/react";
import Link from "next/link";

import { useSound } from "./hooks/useSound";

// Header component
export default function Header() {


  const click = useSound('/audio/mouse-clicks.mp3')

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  const handleMenuClick = () => {
    click();
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      click();
      if (!event.target) return;
      const target = event.target as Node;

      if (menuBtnRef.current?.contains(target)) return;

      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <header className={styles.header}>
      <nav className={styles.headerNav}>
        <Button ref={menuBtnRef} className={styles.menuBtn} onClick={handleMenuClick}>
          {isOpen ? "Close" : "Menu"}
        </Button>
      </nav>
      <NavMenu ref={menuRef} isOpen={isOpen} onClick={() => setIsOpen(false)} />
    </header>
  );
};

type NavMenuProps = {
  ref: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onClick: () => void;
};

const NavMenu = ({ ref, isOpen, onClick }: NavMenuProps) => {
  // Define positions based on current state
  const stageVariants = {
    closed: { y: "110vh" }, // Hidden below the screen
    open: { y: "13%" }     // Slides up into view
  };

  return (
    <motion.div
      ref={ref}
      className={`${styles.navMenuWrapper} ${isOpen ? styles.open : ""}`}
      initial="closed"
      animate={isOpen ? "open" : "closed"}
      variants={stageVariants}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      {/* ...rest of NavMenu unchanged... */}
      <div className={styles.navMenu}>
        <div className={styles.navLinksWrapper}>
          {NavLinks.map(({ idx, title, link, download}, i) => (
            <div key={i} className={styles.navLinkItem}>
              <Link
                href={link}
                target="_self"
                className={styles.navLink}
                onClick={onClick}
                {...(download ? { download } : {})}
              >
                <div className={styles.linkContent}>
                  <span className={styles.linkIdx}>0{idx}</span>
                  <span>{title}</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

type NavLinksTypes = {
  idx: number,
  title: string,
  link: string,
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
    title: "Story" ,
    link: "/my-journey",
  },
  {
    idx: 3 ,
    title: "Work" ,
    link: "/case-studies",
  },  {
    idx: 4 ,
    title: "Resume" ,
    link: "/docs/kobe-tio-resume.pdf",
    download: "Kobe-Tio-Resume.pdf",
  }
]
