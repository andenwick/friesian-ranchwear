"use client";

import { useRef, useEffect, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import styles from "./ScrollRope.module.css";

export default function ScrollRope() {
  const pathRef = useRef(null);
  const [pathLength, setPathLength] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile and get path length on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Get the actual path length for the stroke animation
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useGSAP(
    () => {
      if (!pathLength || isMobile) return;

      // Set initial state - path hidden
      gsap.set(pathRef.current, {
        strokeDasharray: pathLength,
        strokeDashoffset: pathLength,
      });

      // Animate the stroke drawing as user scrolls
      gsap.to(pathRef.current, {
        strokeDashoffset: 0,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
        },
      });
    },
    { dependencies: [pathLength, isMobile] }
  );

  // Don't render on mobile (temporarily disabled for testing)
  // if (isMobile) return null;

  return (
    <div className={styles.container} aria-hidden="true">
      <svg
        className={styles.svg}
        viewBox="0 0 100 1000"
        preserveAspectRatio="none"
        fill="none"
      >
        {/* Weaving rope path through center of page */}
        <path
          ref={pathRef}
          className={styles.rope}
          d="
            M 50 0
            C 80 50, 80 100, 50 150
            C 20 200, 20 250, 50 300
            C 80 350, 80 400, 50 450
            C 20 500, 20 550, 50 600
            C 80 650, 80 700, 50 750
            C 20 800, 20 850, 50 900
            C 65 925, 65 975, 50 1000
          "
        />
      </svg>
    </div>
  );
}
