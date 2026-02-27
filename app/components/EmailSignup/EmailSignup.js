"use client";

import { useState, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { isValidEmail } from "@/lib/validation";
import styles from "./EmailSignup.module.css";

export default function EmailSignup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const sectionRef = useRef(null);
  const contentRef = useRef(null);

  useGSAP(
    () => {
      gsap.fromTo(
        contentRef.current,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power1.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: sectionRef }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setEmail("");
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Failed to connect. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.section} ref={sectionRef}>
      <div className={styles.content} ref={contentRef}>
        <h2 className={styles.heading}>STAY POSTED.</h2>

        {success ? (
          <div className={styles.successMessage}>
            You are on the list.
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              type="email"
              className={styles.input}
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              aria-label="Email address"
            />
            <button
              type="submit"
              className={styles.button}
              disabled={loading}
            >
              {loading ? "..." : "\u2192"}
            </button>
          </form>
        )}
        {error && <p className={styles.errorMessage}>{error}</p>}
      </div>
    </section>
  );
}
