'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import styles from './page.module.css';

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
                  Sign in to view account orders. Guest orders can be viewed from the
                  secure confirmation page in the browser used for checkout.
                </p>
                <p className={styles.subtitle}>
                  Guest order recovery by email is unavailable until verified email
                  delivery is configured.
                </p>
                <Link href="/auth/signin" className={styles.button}>
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
