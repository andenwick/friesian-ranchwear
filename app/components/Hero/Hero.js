"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import styles from "./Hero.module.css";

export default function Hero() {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctaRef = useRef(null);

  // Entrance animations with blur
  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power1.out" } });

      tl.fromTo(
        titleRef.current,
        { opacity: 0, y: 25, filter: "blur(6px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.5 }
      )
        .fromTo(
          subtitleRef.current,
          { opacity: 0, y: 15, filter: "blur(4px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.2 },
          "-=1.0"
        )
        .fromTo(
          ctaRef.current,
          { opacity: 0, y: 20, filter: "blur(4px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.2 },
          "-=0.8"
        );
    },
    { scope: sectionRef }
  );

  // Scroll-triggered shimmer on title text
  useGSAP(
    () => {
      gsap.to(titleRef.current, {
        backgroundPosition: "-50% 50%",
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    },
    { scope: sectionRef }
  );

  return (
    <section className={styles.hero} ref={sectionRef}>
      <div className={styles.content}>
        <h1 className={styles.title} ref={titleRef}>
          FRIESIAN
        </h1>
        <p className={styles.subtitle} ref={subtitleRef}>
          Nothing you wear is an accident.
        </p>
        <a href="/products" className={styles.cta} ref={ctaRef}>
          <span>SHOP COLLECTION</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </section>
  );
}
