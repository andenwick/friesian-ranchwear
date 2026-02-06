"use client";

import { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useScrollToSection } from "@/lib/hooks/useScrollToSection";
import ProductCard from "@/app/components/ProductCard/ProductCard";
import styles from "./ProductShowcase.module.css";

// Number of skeleton cards to show during loading
const SKELETON_COUNT = 6;

export default function ProductShowcase() {
  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const cardsRef = useRef([]);
  const scrollToShop = useScrollToSection({ activateCta: true });

  // State for dynamic product fetching
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch homepage products from API on mount
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch("/api/products?display=homepage");
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
      <section className={`${styles.showcase} canvas-texture`} ref={sectionRef}>
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
      <section className={`${styles.showcase} canvas-texture`} ref={sectionRef}>
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
      <section className={`${styles.showcase} canvas-texture`} ref={sectionRef}>
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
    <section className={`${styles.showcase} canvas-texture`} ref={sectionRef}>
      <div className={styles.container}>
        <h2 className={styles.heading} ref={headingRef}>
          The Line
        </h2>
        <div className={styles.grid}>
          {products.map((product, index) => (
            <div
              key={product.id}
              ref={(el) => (cardsRef.current[index] = el)}
            >
              <ProductCard product={product} showLink={true} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
