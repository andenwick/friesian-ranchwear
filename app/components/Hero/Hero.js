"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import styles from "./Hero.module.css";

export default function Hero() {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);
  const logoRef = useRef(null);
  const brandRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctaRef = useRef(null);

  // GSAP entrance animations
  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        logoRef.current,
        { opacity: 0, scale: 0.8, y: 20 },
        { opacity: 0.9, scale: 1, y: 0, duration: 1 }
      )
        .fromTo(
          brandRef.current,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.8 },
          "-=0.5"
        )
        .fromTo(
          subtitleRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6 },
          "-=0.4"
        )
        .fromTo(
          ctaRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.6 },
          "-=0.3"
        );
    },
    { scope: sectionRef }
  );

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      const scrollY = window.scrollY;
      const opacity = Math.max(0, 1 - scrollY / 600);
      const translateY = scrollY * 0.4;
      const scale = Math.max(0.9, 1 - scrollY / 3000);

      contentRef.current.style.transform = `translateY(${translateY}px) scale(${scale})`;
      contentRef.current.style.opacity = opacity;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className={`${styles.hero} canvas-texture`} ref={sectionRef}>
      <div className={styles.backgroundGlow} aria-hidden="true" />

      <div className={styles.content} ref={contentRef}>
        <Image
          ref={logoRef}
          src="/logo-new.png"
          alt="Friesian Ranchwear"
          width={150}
          height={150}
          className={styles.logo}
          priority
        />

        <h1 className={styles.brandName} ref={brandRef}>
          FRIESIAN
        </h1>
        <p className={styles.subtitle} ref={subtitleRef}>
          Western Style, Street Ready
        </p>

        <a href="#tiktok-shop" className={styles.cta} ref={ctaRef}>
          <span>Shop the Drop</span>
          <svg
            className={styles.ctaArrow}
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
