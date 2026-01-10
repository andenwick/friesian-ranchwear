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
        defaults: { immediateRender: false },
      });

      tl.fromTo(
        headingRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power2.out" }
      )
        .fromTo(
          textRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
          "-=0.4"
        )
        .fromTo(
          ctaRef.current,
          { scale: 0.9, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" },
          "-=0.3"
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
          Browse our full lineup on TikTok Shop. Fresh styles drop regularly—find
          your next favorite piece.
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
