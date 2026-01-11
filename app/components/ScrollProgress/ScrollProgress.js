"use client";

import { useRef, useEffect } from "react";
import styles from "./ScrollProgress.module.css";

export default function ScrollProgress() {
  const containerRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollTop / docHeight : 0;

      // Fade in after scrolling 100px
      if (containerRef.current) {
        const opacity = Math.min(scrollTop / 100, 1);
        containerRef.current.style.opacity = opacity;
      }

      if (progressRef.current) {
        progressRef.current.style.transform = `scaleY(${Math.min(progress, 1)})`;
      }
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress(); // Initial call

    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  return (
    <div className={styles.container} ref={containerRef} aria-hidden="true">
      <div className={styles.track}>
        <div className={styles.progress} ref={progressRef} />
      </div>
    </div>
  );
}
