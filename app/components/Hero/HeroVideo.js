"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";

// Plays the whip drop once and holds on its last frame. The poster is the empty opening frame; with reduced
// motion, when the browser blocks autoplay (iOS Low Power Mode), or when no frame has decoded after a few
// seconds, the poster switches to the final frame instead.
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

    // Safari can accept play() and never decode a frame, which leaves the empty opening poster up for good
    const stall = setTimeout(() => {
      if (video.readyState >= 2) return;
      video.pause();
      showFinalFrame();
      video.addEventListener("loadeddata", () => (video.currentTime = video.duration), { once: true });
    }, 4000);
    return () => clearTimeout(stall);
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
      {/* MP4 first: iOS Safari reports WebM support but can fail to decode it without an error */}
      <source src="/hero/whip-hero.mp4" type="video/mp4" />
      <source src="/hero/whip-hero.webm" type="video/webm" />
    </video>
  );
}
