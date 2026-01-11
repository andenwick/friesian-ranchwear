"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

// Register plugins
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// Default animation settings
gsap.defaults({
  ease: "power2.out",
  duration: 0.8,
});

// Respect reduced motion preference
if (typeof window !== "undefined") {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) {
    gsap.globalTimeline.timeScale(100);
  }
}

export { gsap, ScrollTrigger };
