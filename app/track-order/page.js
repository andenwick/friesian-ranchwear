'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import styles from './page.module.css';

function GuestOrderEmailForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/orders/email-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
      } else {
        setMessage(data.message || 'If we have orders for that email, we just sent them there.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <label htmlFor="order-email" className={styles.formLabel}>
        Checked out as a guest? We&apos;ll email you your orders.
      </label>
      <div className={styles.inputGroup}>
        <input
          id="order-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Sending...' : 'Email Me'}
        </button>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {message && <p className={styles.notice} role="status">{message}</p>}
    </form>
  );
}

export default function TrackOrderPage() {
  const { data: session, status } = useSession();

  return (
    <div className={styles.page}>
      <Header alwaysVisible={true} />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>TRACK YOUR ORDER</h1>
            {status === 'loading' ? (
              <p className={styles.subtitle}>Checking your account...</p>
            ) : session ? (
              <>
                <p className={styles.subtitle}>
                  Your order history is protected by your signed-in account.
                </p>
                <Link href="/account/orders" className={styles.button}>
                  View My Orders
                </Link>
              </>
            ) : (
              <>
                <p className={styles.subtitle}>
                  Have an account? Sign in to see every order and its status.
                </p>
                <Link href="/auth/signin?callbackUrl=%2Faccount%2Forders" className={styles.button}>
                  Sign In
                </Link>
              </>
            )}
          </div>
          {status !== 'loading' && !session && <GuestOrderEmailForm />}
        </div>
      </main>
      <Footer />
    </div>
  );
}
