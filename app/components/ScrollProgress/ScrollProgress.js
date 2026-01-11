"use client";

import { useRef, useEffect } from "react";
import styles from "./ScrollProgress.module.css";

export default function ScrollProgress() {
  const containerRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const footer = document.querySelector('footer');
      const footerTop = footer ? footer.offsetTop : document.documentElement.scrollHeight;
      const stopPoint = footerTop - window.innerHeight;
      const progress = stopPoint > 0 ? Math.min(scrollTop / stopPoint, 1) : 0;

      // Fade in after scrolling 400px
      if (containerRef.current) {
        const opacity = Math.min(scrollTop / 400, 1);
        containerRef.current.style.opacity = opacity;
      }

      if (progressRef.current) {
        progressRef.current.style.transform = `scaleY(${progress})`;
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
