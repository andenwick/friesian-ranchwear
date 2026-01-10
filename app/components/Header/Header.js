"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./Header.module.css";

export default function Header() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`${styles.header} ${isVisible ? styles.visible : ""}`}>
      <div className={styles.container}>
        {/* Brand Logo + Name */}
        <a href="#" className={styles.brand}>
          <Image
            src="/logo-new.png"
            alt="Friesian Ranchwear"
            width={52}
            height={52}
            className={styles.logo}
          />
          <span className={styles.brandName}>FRIESIAN<span className={styles.trademark}>™</span></span>
        </a>

        {/* Navigation + Social Links */}
        <nav className={styles.nav}>
          <div className={styles.socialLinks}>
            <a
              href="https://tiktok.com/@friesianranchwear"
              className={styles.socialLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow us on TikTok"
            >
              <svg
                className={styles.socialIcon}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
            </a>
            <a
              href="https://instagram.com/friesianranchwear"
              className={styles.socialLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow us on Instagram"
            >
              <svg
                className={styles.socialIcon}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
            </a>
          </div>
          <a href="#tiktok-shop" className={styles.shopLink} onClick={(e) => {
            e.preventDefault();
            const target = document.getElementById('tiktok-shop');
            if (target) {
              const offset = 120;
              const top = target.getBoundingClientRect().top + window.scrollY - offset;
              window.scrollTo({ top, behavior: 'smooth' });
            }
          }}>
            Shop Now
          </a>
        </nav>
      </div>
      <div className={styles.goldLine} aria-hidden="true" />
    </header>
  );
}
