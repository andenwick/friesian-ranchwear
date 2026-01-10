"use client";

import { useEffect, useState } from "react";
import styles from "./ParallaxShapes.module.css";

// Western symbols - lassos and boots only
const symbols = [
  // Lasso - classic rope loop
  <svg key="lasso1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <ellipse cx="10" cy="9" rx="6" ry="5" />
    <path d="M16 9c0 0 1 3 1 6c0 2-1 4-1 6" />
    <path d="M17 21c1 0 2-1 2-1" />
  </svg>,
  // Cowboy boot - classic western
  <svg key="boot1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2c0 0-.5 1-.5 3s.5 4 .5 6c-1.5 1-3 2-4 4v4c0 1 0 2 1 2h3v-2h-1v-2h10v4h3c1 0 1-1 1-2v-3c0-2-1-3-2-4-.5-2-.5-4-.5-6s-.5-3-.5-3h-10z" />
  </svg>,
  // Lasso - swinging
  <svg key="lasso2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <circle cx="11" cy="8" r="5" />
    <path d="M16 8c2 3 3 6 2 10" />
    <path d="M18 18c0 2 1 3 2 3" />
  </svg>,
  // Boot - tall shaft
  <svg key="boot2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 1h8v10c1 1 2 2 2 4v5c0 1-1 2-2 2H5c-1 0-1-1-1-2v-3c0-2 1-3 3-5V1z" />
    <path d="M7 4h8M7 7h8" />
  </svg>,
  // Lasso - overhead loop
  <svg key="lasso3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <ellipse cx="12" cy="7" rx="7" ry="4" />
    <path d="M19 7c0 4-1 8-2 12" />
    <path d="M17 19l2 2" />
  </svg>,
  // Boot - side profile with heel
  <svg key="boot3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2h6v8c2 2 3 4 3 6v4H4v-2h2v-2c0-2 1-4 3-5V2z" />
    <path d="M9 5h6" />
  </svg>,
];

// Spread shapes across full page (500vh worth)
const generateShapes = () => {
  const shapes = [];
  const count = 60;

  for (let i = 0; i < count; i++) {
    shapes.push({
      id: i,
      symbol: symbols[i % symbols.length],
      x: 5 + Math.abs((i * 37) % 90), // Pseudo-random x between 5-95%
      y: (i * 8) + (i % 3) * 2, // Spread evenly down the page (0-500vh range)
      size: 12 + (i % 10),
      opacity: 0.08 + (i % 5) * 0.02,
      rotation: (i * 23) % 360 - 180,
    });
  }
  return shapes;
};

const shapes = generateShapes();

export default function ParallaxShapes() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isMobile) return null;

  return (
    <div className={styles.container} aria-hidden="true">
      {shapes.map((shape) => (
        <div
          key={shape.id}
          className={styles.shape}
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}vh`,
            width: `${shape.size}px`,
            height: `${shape.size}px`,
            opacity: shape.opacity,
            transform: `rotate(${shape.rotation}deg)`,
          }}
        >
          {shape.symbol}
        </div>
      ))}
    </div>
  );
}
