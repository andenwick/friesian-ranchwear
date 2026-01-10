"use client";

import { useState } from "react";
import styles from "./EmailSignup.module.css";

export default function EmailSignup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Client-side validation
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
    <section className={styles.emailSignup}>
      <div className={styles.content}>
        <h2 className={styles.heading}>Stay Connected</h2>
        <p className={styles.text}>
          Be the first to know about new drops, exclusive deals, and behind-the-scenes content.
        </p>

        {success ? (
          <div className={styles.successMessage}>
            You are in! Check your inbox for updates.
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
                {loading ? "Joining..." : "Join"}
              </button>
            </div>
            {error && <p className={styles.errorMessage}>{error}</p>}
          </form>
        )}
      </div>
    </section>
  );
}
