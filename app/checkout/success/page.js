'use client';

import { useEffect, useState, Suspense } from 'react';
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
  const [verifying, setVerifying] = useState(true);
  const [orderData, setOrderData] = useState(null);

  // Clear cart on mount
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  // Verify order on mount
  useEffect(() => {
    if (!orderId) {
      setVerifying(false);
      return;
    }

    let pollInterval;

    fetch('/api/orders/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setOrderData(data);

          // If still pending, poll up to 5 times
          if (data.status === 'PENDING') {
            let retries = 0;
            pollInterval = setInterval(async () => {
              retries++;
              try {
                const res = await fetch('/api/orders/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ orderId }),
                });
                const d = await res.json();
                if (d.valid && d.status !== 'PENDING') {
                  setOrderData(d);
                  clearInterval(pollInterval);
                }
              } catch {}
              if (retries >= 5) clearInterval(pollInterval);
            }, 3000);
          }
        }
      })
      .catch(() => {})
      .finally(() => setVerifying(false));

    return () => { if (pollInterval) clearInterval(pollInterval); };
  }, [orderId]);

  if (verifying) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p className={styles.subtitle}>Verifying your order...</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Order Not Found</h1>
          <p className={styles.message}>
            We couldn't verify this order. If you just placed an order, it may still be processing.
            Please check your email or track your order below.
          </p>
          <div className={styles.actions}>
            <Link href="/track-order" className={styles.button}>
              Track Your Order
            </Link>
            <Link href="/products" className={styles.buttonSecondary}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className={styles.title}>
          {orderData.status === 'PENDING' ? 'Payment Processing...' : 'Order Confirmed'}
        </h1>
        <p className={styles.subtitle}>
          {orderData.status === 'PENDING'
            ? 'Your payment is being processed. This page will update automatically.'
            : 'Thank you for your purchase!'}
        </p>

        <div className={styles.orderId}>
          <p className={styles.orderLabel}>Order Number</p>
          <p className={styles.orderNumber}>{orderData.orderNumber}</p>
        </div>

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
