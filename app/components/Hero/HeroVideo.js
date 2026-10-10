"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";

// Plays the whip drop once and holds on its last frame. The poster is the empty opening frame; with reduced
// motion, or when the browser blocks autoplay (iOS Low Power Mode), the poster switches to the final frame instead.
export default function HeroVideo() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const showFinalFrame = () => {
      video.poster = "/hero/whip-hero-poster.jpg";
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      showFinalFrame();
      return;
    }
    video.play().catch(showFinalFrame);
  }, []);

  return (
    <video
      ref={videoRef}
      className={styles.video}
      poster="/hero/whip-hero-start.jpg"
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
    >
      <source src="/hero/whip-hero.webm" type="video/webm" />
      <source src="/hero/whip-hero.mp4" type="video/mp4" />
    </video>
  );
}
