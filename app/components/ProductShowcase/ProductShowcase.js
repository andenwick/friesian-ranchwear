"use client";

import { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import ProductCard from "@/app/components/ProductCard/ProductCard";
import styles from "./ProductShowcase.module.css";

const SKELETON_COUNT = 6;

export default function ProductShowcase() {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useGSAP(
    () => {
      if (loading || products.length === 0) return;

      gsap.fromTo(
        cardsRef.current.filter(Boolean),
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power1.out",
          stagger: 0.1,
          immediateRender: false,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: sectionRef, dependencies: [loading, products] }
  );

  if (loading) {
    return (
      <section className={styles.section} ref={sectionRef}>
        <div className={styles.grid}>
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <div key={index} className={styles.skeletonCard}>
              <div className={styles.skeletonImage} />
              <div className={styles.skeletonInfo}>
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonPrice} />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.section} ref={sectionRef}>
        <div className={styles.emptyState}>
          <p className={styles.emptyMessage}>{error}</p>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className={styles.section} ref={sectionRef}>
        <div className={styles.emptyState}>
          <p className={styles.emptyMessage}>No products available yet</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section} ref={sectionRef}>
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
    </section>
  );
}
