'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './admin.module.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    orders: 0,
    revenue: 0,
    emailSubscribers: 0,
    products: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch products and emails in parallel
        const [productsRes, emailsRes] = await Promise.all([
          fetch('/api/admin/products'),
          fetch('/api/admin/emails')
        ]);

        let products = [];
        if (productsRes.ok) {
          const data = await productsRes.json();
          products = data.products || [];
        }

        let emailCount = 0;
        if (emailsRes.ok) {
          const emailData = await emailsRes.json();
          emailCount = emailData.total || emailData.emails?.length || 0;
        }

        setStats({
          orders: 0, // Will come from orders API later
          revenue: 0, // Will come from Stripe later
          emailSubscribers: emailCount,
          products: products.length,
        });

        setRecentOrders([]); // Will come from orders API later
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingContainer} style={{ minHeight: '50vh', background: 'transparent' }}>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>DASHBOARD</h1>
          <p className={styles.pageSubtitle}>Welcome to Friesian Ranchwear admin</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <Link href="/admin/orders" className={styles.statCard} style={{ textDecoration: 'none' }}>
          <div className={styles.statIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <div className={styles.statLabel}>Total Orders</div>
          <div className={`${styles.statValue} ${styles.statAccent}`}>{stats.orders}</div>
        </Link>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className={styles.statLabel}>Revenue</div>
          <div className={styles.statValue}>${stats.revenue.toLocaleString()}</div>
        </div>
        <Link href="/admin/emails" className={styles.statCard} style={{ textDecoration: 'none' }}>
          <div className={styles.statIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div className={styles.statLabel}>Email Subscribers</div>
          <div className={styles.statValue}>{stats.emailSubscribers}</div>
        </Link>
        <Link href="/admin/products" className={styles.statCard} style={{ textDecoration: 'none' }}>
          <div className={styles.statIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div className={styles.statLabel}>Products</div>
          <div className={styles.statValue}>{stats.products}</div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className={styles.pageHeader} style={{ marginTop: 'var(--space-xl)' }}>
        <div>
          <h2 className={styles.pageTitle} style={{ fontSize: 'var(--font-size-xl)' }}>RECENT ORDERS</h2>
        </div>
        <Link href="/admin/orders" className={styles.secondaryButton}>
          View All
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {recentOrders.length > 0 ? (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <span style={{ fontWeight: 500 }}>#{order.orderNumber}</span>
                  </td>
                  <td>{order.customerName || order.email}</td>
                  <td>${order.total?.toFixed(2) || '0.00'}</td>
                  <td>
                    <span className={`${styles.badge} ${
                      order.status === 'completed' ? styles.badgeActive :
                      order.status === 'pending' ? styles.badgeDraft :
                      styles.badgeOutOfStock
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <h3 className={styles.emptyTitle}>No orders yet</h3>
            <p className={styles.emptyText}>Orders will appear here once customers start purchasing</p>
          </div>
        </div>
      )}
    </div>
  );
}
