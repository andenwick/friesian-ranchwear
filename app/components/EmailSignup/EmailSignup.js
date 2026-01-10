"use client";

import { useState, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import styles from "./EmailSignup.module.css";

export default function EmailSignup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const textRef = useRef(null);
  const formRef = useRef(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
        defaults: { immediateRender: false },
      });

      tl.fromTo(
        headingRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power2.out" }
      )
        .fromTo(
          textRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
          "-=0.4"
        )
        .fromTo(
          formRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
          "-=0.3"
        );
    },
    { scope: sectionRef }
  );

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!validateEmail(email)) {
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
    <section className={`${styles.emailSignup} canvas-texture`} ref={sectionRef}>
      <div className={styles.content}>
        <h2 className={styles.heading} ref={headingRef}>
          Join the List
        </h2>
        <p className={styles.text} ref={textRef}>
          Be first to know about new drops, exclusive offers, and what is coming next.
        </p>

        <div ref={formRef}>
          {success ? (
            <div className={styles.successMessage}>
              You are on the list. We will be in touch soon.
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.inputWrapper}>
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
                  {loading ? "..." : "Subscribe"}
                </button>
              </div>
              {error && <p className={styles.errorMessage}>{error}</p>}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
