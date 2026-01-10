"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import styles from "./ProductShowcase.module.css";

const products = [
  { id: 1, name: "Classic Western Tee", price: "$45", color: "#2A2A2A" },
  { id: 2, name: "Range Rider Hoodie", price: "$89", color: "#1F1F1F" },
  { id: 3, name: "Trail Blazer Cap", price: "$35", color: "#333333" },
  { id: 4, name: "Desert Storm Jacket", price: "$120", color: "#252525" },
  { id: 5, name: "Frontier Jeans", price: "$75", color: "#2E2E2E" },
  { id: 6, name: "Rancher Flannel", price: "$65", color: "#1A1A1A" },
];

export default function ProductShowcase() {
  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const cardsRef = useRef([]);

  useGSAP(
    () => {
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
        cardsRef.current,
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
    { scope: sectionRef }
  );

  return (
    <section className={styles.showcase} ref={sectionRef}>
      <div className={styles.container}>
        <h2 className={styles.heading} ref={headingRef}>
          The Collection
        </h2>
        <div className={styles.grid}>
          {products.map((product, index) => (
            <a
              key={product.id}
              href="#tiktok-shop"
              className={styles.card}
              ref={(el) => (cardsRef.current[index] = el)}
            >
              <div className={styles.imageWrapper}>
                <div
                  className={styles.imagePlaceholder}
                  style={{ backgroundColor: product.color }}
                />
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
