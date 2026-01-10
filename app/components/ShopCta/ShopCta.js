"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import styles from "./ShopCta.module.css";

export default function ShopCta() {
  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const textRef = useRef(null);
  const ctaRef = useRef(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          toggleActions: "play none none none",
        },
        defaults: { immediateRender: false, ease: "power1.out" },
      });

      tl.fromTo(
        headingRef.current,
        { y: 25, opacity: 0, filter: "blur(6px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.4 }
      )
        .fromTo(
          textRef.current,
          { y: 20, opacity: 0, filter: "blur(4px)" },
          { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.2 },
          "-=1.0"
        )
        .fromTo(
          ctaRef.current,
          { y: 15, opacity: 0, filter: "blur(4px)" },
          { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.2 },
          "-=0.8"
        );
    },
    { scope: sectionRef }
  );

  return (
    <section className={`${styles.shopCta} canvas-texture`} id="tiktok-shop" ref={sectionRef}>
      <div className={styles.content}>
        <h2 className={styles.heading} ref={headingRef}>
          Shop the Collection
        </h2>
        <p className={styles.text} ref={textRef}>
          Quality pieces. Real craftsmanship. See what we have been working on.
        </p>
        <a
          href="https://tiktok.com/@friesianranchwear"
          className={styles.cta}
          target="_blank"
          rel="noopener noreferrer"
          ref={ctaRef}
        >
          Shop on TikTok
        </a>
      </div>
    </section>
  );
}
