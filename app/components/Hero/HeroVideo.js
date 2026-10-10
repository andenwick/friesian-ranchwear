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
      video.poster = "/hero/v3/whip-hero-poster.jpg";
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
      poster="/hero/v3/whip-hero-start.jpg"
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
    >
      {/* MP4 first: iOS Safari reports WebM support but can fail to decode it without an error. HEVC is sharper
          per byte where it is supported (Apple devices, most current Chrome/Edge); H.264 and WebM are fallbacks.
          Files live in a versioned folder so a tab left open from an older release never mixes old and new. */}
      <source src="/hero/v3/whip-hero-hevc.mp4" type='video/mp4; codecs="hvc1"' />
      <source src="/hero/v3/whip-hero.mp4" type="video/mp4" />
      <source src="/hero/v3/whip-hero.webm" type="video/webm" />
    </video>
  );
}
