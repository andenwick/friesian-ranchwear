"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import styles from "./ScrollProgress.module.css";

export default function ScrollProgress() {
  const progressRef = useRef(null);

  useGSAP(() => {
    gsap.to(progressRef.current, {
      scaleY: 1,
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
      },
    });
  });

  return (
    <div className={styles.container} aria-hidden="true">
      <div className={styles.track}>
        <div className={styles.progress} ref={progressRef} />
      </div>
    </div>
  );
}
