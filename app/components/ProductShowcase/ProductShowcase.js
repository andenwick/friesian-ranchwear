"use client";

import { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import styles from "./ProductShowcase.module.css";

// Number of skeleton cards to show during loading
const SKELETON_COUNT = 6;

/**
 * Converts Google Drive share links to proxied image URLs.
 * Uses our API proxy to avoid CORS and redirect issues.
 */
function convertDriveUrl(url) {
  if (!url) return url;

  // Already using our proxy
  if (url.startsWith('/api/image')) return url;

  // Local images - return as-is
  if (url.startsWith('/')) return url;

  // Extract file ID from various Google Drive URL formats
  let fileId = null;

  // Match /file/d/FILE_ID/ pattern
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    fileId = fileMatch[1];
  }

  // Match open?id=FILE_ID or uc?id=FILE_ID pattern
  if (!fileId) {
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      fileId = idMatch[1];
    }
  }

  // If we found a file ID, use our proxy
  if (fileId) {
    return `/api/image?id=${fileId}`;
  }

  // Not a Drive link, return as-is
  return url;
}

export default function ProductShowcase() {
  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const cardsRef = useRef([]);

  // State for dynamic product fetching
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch products from API on mount
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch("/api/products");
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Unable to load products");
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // GSAP animations - triggered when products load
  useGSAP(
    () => {
      // Don't run animations while loading or if no products
      if (loading || products.length === 0) return;

      // Heading animation - ghostly fade
      gsap.fromTo(
        headingRef.current,
        { y: 30, opacity: 0, filter: "blur(6px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 1.4,
          ease: "power1.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );

      // Staggered card reveal - graceful emergence
      gsap.fromTo(
        cardsRef.current.filter(Boolean),
        { y: 40, opacity: 0, filter: "blur(4px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 1.2,
          ease: "power1.out",
          stagger: {
            amount: 1.2,
            from: "start",
          },
          immediateRender: false,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: sectionRef, dependencies: [loading, products] }
  );

  // Render loading skeleton
  if (loading) {
    return (
      <section className={`${styles.showcase}`} ref={sectionRef}>
        <div className={styles.container}>
          <h2 className={styles.heading} ref={headingRef}>
            The Line
          </h2>
          <div className={styles.grid}>
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <div key={index} className={styles.skeletonCard}>
                <div className={styles.skeletonImage} />
                <div className={styles.skeletonContent}>
                  <div className={styles.skeletonTitle} />
                  <div className={styles.skeletonPrice} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Render error state
  if (error) {
    return (
      <section className={`${styles.showcase}`} ref={sectionRef}>
        <div className={styles.container}>
          <h2 className={styles.heading} ref={headingRef}>
            The Line
          </h2>
          <div className={styles.emptyState}>
            <p className={styles.emptyMessage}>{error}</p>
          </div>
        </div>
      </section>
    );
  }

  // Render empty state
  if (products.length === 0) {
    return (
      <section className={`${styles.showcase}`} ref={sectionRef}>
        <div className={styles.container}>
          <h2 className={styles.heading} ref={headingRef}>
            The Line
          </h2>
          <div className={styles.emptyState}>
            <p className={styles.emptyMessage}>No products available yet</p>
          </div>
        </div>
      </section>
    );
  }

  // Render products
  return (
    <section className={`${styles.showcase}`} ref={sectionRef}>
      <div className={styles.container}>
        <h2 className={styles.heading} ref={headingRef}>
          The Line
        </h2>
        <div className={styles.grid}>
          {products.map((product, index) => (
            <a
              key={product.id}
              href="#tiktok-shop"
              className={styles.card}
              ref={(el) => (cardsRef.current[index] = el)}
              onClick={(e) => {
                e.preventDefault();
                const target = document.getElementById('tiktok-shop');
                if (target) {
                  gsap.to(window, {
                    duration: 1.5,
                    scrollTo: { y: target, offsetY: 120 },
                    ease: "power2.inOut"
                  });
                }
              }}
            >
              <div className={styles.imageWrapper}>
                {product.imageUrl ? (
                  <img
                    src={convertDriveUrl(product.imageUrl)}
                    alt={product.name}
                    className={styles.productImage}
                  />
                ) : (
                  <div className={styles.imagePlaceholder} />
                )}
                <span className={styles.comingSoonBadge}>Coming Soon</span>
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.productName}>{product.name}</h3>
                <p className={styles.productPrice}>{product.price}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
