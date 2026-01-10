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
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
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
        <p className={styles.brand}>Friesian Ranchwear<span className={styles.trademark}>™</span></p>
        <p className={styles.copyright}>
          {currentYear} Friesian Ranchwear<span className={styles.trademark}>™</span>. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
