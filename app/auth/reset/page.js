'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/app/components/Footer/Footer';
import styles from '../auth.module.css';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExpired(false);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setExpired(response.status === 400 && !String(data.error || '').startsWith('Password'));
        return;
      }
      router.push('/auth/signin?reset=true');
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

          <h1 className={styles.title}>New Password</h1>

          {!token ? (
            <p className={styles.footerText}>
              This reset link is incomplete.{' '}
              <Link href="/auth/forgot" className={styles.link}>Request a new one</Link>
            </p>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              {error && (
                <div className={styles.error} role="alert">
                  {error}{' '}
                  {expired && (
                    <Link href="/auth/forgot" className={styles.link}>Request a new link</Link>
                  )}
                </div>
              )}

              <div className={styles.field}>
                <label htmlFor="password" className={styles.label}>New password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="confirm" className={styles.label}>Confirm password</label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={styles.input}
                  placeholder="Type it again"
                  required
                  autoComplete="new-password"
                />
              </div>

              <button type="submit" className={styles.button} disabled={loading}>
                {loading ? 'Saving...' : 'Save Password'}
              </button>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.card}>Loading...</div></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
