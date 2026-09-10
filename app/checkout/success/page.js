'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useCart } from '@/lib/cart-context';
import {
  loadGuestOrderAccess,
  retireActiveCheckoutKey,
  shouldClearCartForOrderStatus,
} from '@/lib/browser-checkout-access';
import styles from './page.module.css';

function SuccessContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { clearCart } = useCart();
  const orderId = searchParams.get('orderId');
  const [verifying, setVerifying] = useState(true);
  const [orderData, setOrderData] = useState(null);

  // Verify order on mount
  useEffect(() => {
    if (!orderId) {
      setVerifying(false);
      return;
    }

    let pollInterval;
    const accessKey = loadGuestOrderAccess(localStorage, orderId);
    const headers = {
      'Content-Type': 'application/json',
      ...(accessKey ? { 'X-Order-Access-Key': accessKey } : {}),
    };

    fetch('/api/orders/verify', {
      method: 'POST',
      headers,
      body: JSON.stringify({ orderId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setOrderData(data);
          if (data.status !== 'PENDING') retireActiveCheckoutKey(localStorage, accessKey);
          if (shouldClearCartForOrderStatus(data.status)) clearCart();

          // If still pending, poll up to 5 times
          if (data.status === 'PENDING') {
            let retries = 0;
            pollInterval = setInterval(async () => {
              retries++;
              try {
                const res = await fetch('/api/orders/verify', {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({ orderId }),
                });
                const d = await res.json();
                if (d.valid && d.status !== 'PENDING') {
                  setOrderData(d);
                  retireActiveCheckoutKey(localStorage, accessKey);
                  if (shouldClearCartForOrderStatus(d.status)) clearCart();
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
  }, [clearCart, orderId]);

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
            Signed-in customers can check account history. Guest confirmation works
            in the same browser used at checkout for 30 days.
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

        <h1 className={styles.title}>{({
          PENDING: 'Payment Processing...',
          CANCELLED: 'Payment Cancelled',
          REFUNDED: 'Order Refunded',
        })[orderData.status] || 'Order Confirmed'}</h1>
        <p className={styles.subtitle}>
          {({
            PENDING: 'Your payment is being processed. This page will update automatically.',
            CANCELLED: 'Stripe confirmed that this payment was cancelled.',
            REFUNDED: 'This order has been refunded.',
          })[orderData.status] || 'Thank you for your purchase!'}
        </p>

        <div className={styles.orderId}>
          <p className={styles.orderLabel}>Order Number</p>
          <p className={styles.orderNumber}>{orderData.orderNumber}</p>
        </div>

        <p className={styles.message}>
          {orderData.status === 'CANCELLED'
            ? 'Your cart has been preserved so you can try checkout again.'
            : 'Save your order number. Guest access remains available in this browser for 30 days.'}
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
