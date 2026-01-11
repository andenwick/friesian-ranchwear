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
  const brandWrapperRef = useRef(null);
  const brandNameRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctaRef = useRef(null);

  // GSAP entrance animations - ghostly, graceful
  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power1.out" } });

      tl.fromTo(
        logoRef.current,
        { opacity: 0, scale: 0.95, y: 15, filter: "blur(8px)" },
        { opacity: 0.9, scale: 1, y: 0, filter: "blur(0px)", duration: 1.8 }
      )
        .fromTo(
          brandWrapperRef.current,
          { opacity: 0, y: 25, filter: "blur(6px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.5 },
          "-=1.2"
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

  // Scroll-triggered shimmer animation on FRIESIAN text
  useGSAP(
    () => {
      gsap.to(brandNameRef.current, {
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
          src="/logo-white.png"
          alt="Friesian Ranchwear"
          width={150}
          height={150}
          className={styles.logo}
          priority
        />

        <div className={styles.brandWrapper} ref={brandWrapperRef}>
          <h1 className={styles.brandName} ref={brandNameRef}>
            FRIESIAN
          </h1>
        </div>
        <p className={styles.subtitle} ref={subtitleRef}>
          Nothing you wear is an accident.
        </p>

        <a href="#tiktok-shop" className={styles.cta} ref={ctaRef} onClick={(e) => {
          e.preventDefault();
          const target = document.getElementById('tiktok-shop');
          if (target) {
            gsap.to(window, {
              duration: 1.5,
              scrollTo: { y: target, offsetY: 120 },
              ease: "power2.inOut",
              onComplete: () => {
                const ctaButton = document.getElementById('shop-cta-button');
                if (ctaButton) {
                  ctaButton.classList.add('ctaActivated');
                  setTimeout(() => {
                    ctaButton.classList.remove('ctaActivated');
                  }, 2000);
                }
              }
            });
          }
        }}>
          <span>See the Line</span>
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
