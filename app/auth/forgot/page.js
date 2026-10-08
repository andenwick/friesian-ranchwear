'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/app/components/Footer/Footer';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
      } else {
        setMessage(data.message || 'If that email has an account, a reset link is on its way.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.card}>
          <Link href="/auth/signin" className={styles.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to sign in
          </Link>

          <Image
            src="/logo-new.png"
            alt="Friesian Ranchwear"
            width={100}
            height={100}
            className={styles.logo}
          />

          <h1 className={styles.title}>Forgot Password</h1>
          <p className={styles.subtitle}>We&apos;ll email you a link to choose a new one</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error} role="alert">{error}</div>}
            {message && <div className={styles.success} role="status">{message}</div>}

            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
}
