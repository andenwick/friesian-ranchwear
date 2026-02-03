'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useCart } from '@/lib/cart-context';
import styles from './page.module.css';

function SuccessContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { clearCart } = useCart();
  const orderId = searchParams.get('orderId');

  // Clear cart on mount
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className={styles.title}>Order Confirmed</h1>
        <p className={styles.subtitle}>Thank you for your purchase!</p>

        {orderId && (
          <div className={styles.orderId}>
            <p className={styles.orderLabel}>Order Number</p>
            <p className={styles.orderNumber}>{orderId}</p>
          </div>
        )}

        <p className={styles.message}>
          We've received your order and will begin processing it shortly.
          You'll receive an email confirmation with tracking information once your order ships.
        </p>

        <div className={styles.actions}>
          {session ? (
            <Link href="/account/orders" className={styles.button}>
              View Your Orders
            </Link>
          ) : (
            <Link href="/track-order" className={styles.button}>
              Track Your Order
            </Link>
          )}

          <Link href="/products" className={styles.buttonSecondary}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
