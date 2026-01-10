"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import styles from "./Footer.module.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const footerRef = useRef(null);
  const contentRef = useRef(null);

  useGSAP(
    () => {
      gsap.fromTo(
        contentRef.current,
        { y: 15, opacity: 0, filter: "blur(4px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 1.2,
          ease: "power1.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: footerRef }
  );

  return (
    <footer className={styles.footer} ref={footerRef}>
      <div className={styles.content} ref={contentRef}>
        <div className={styles.left}>
          <p className={styles.brand}>Friesian Ranchwear<span className={styles.trademark}>™</span></p>
          <p className={styles.location}>Salt Lake City, Utah</p>
        </div>
        <div className={styles.right}>
          <div className={styles.links}>
            <a href="/privacy" className={styles.link}>Privacy</a>
            <span className={styles.divider}>·</span>
            <a href="/terms" className={styles.link}>Terms</a>
          </div>
          <p className={styles.copyright}>
            © {currentYear} Friesian Ranchwear. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
