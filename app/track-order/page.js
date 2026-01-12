'use client';

import { useState } from 'react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import OrderCard from '../components/OrderCard/OrderCard';
import styles from './page.module.css';

export default function TrackOrderPage() {
  const [email, setEmail] = useState('');
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    setOrders(null);

    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setSearched(true);
      } else {
        setError('Failed to find orders. Please try again.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <Header alwaysVisible={true} />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>TRACK YOUR ORDER</h1>
            <p className={styles.subtitle}>
              Enter your email address to view your order history
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className={styles.input}
                required
              />
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className={styles.button}
              >
                {loading ? 'Searching...' : 'Find My Orders'}
              </button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
          </form>

          {searched && orders && (
            <div className={styles.results}>
              {orders.length > 0 ? (
                <>
                  <p className={styles.resultCount}>
                    Found {orders.length} order{orders.length !== 1 ? 's' : ''}
                  </p>
                  <div className={styles.ordersList}>
                    {orders.map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                </>
              ) : (
                <div className={styles.empty}>
                  <svg
                    className={styles.emptyIcon}
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  <h3 className={styles.emptyTitle}>No orders found</h3>
                  <p className={styles.emptyText}>
                    We couldn't find any orders associated with this email address.
                    Please check your email and try again.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
