'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './admin.module.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    revenue: 0,
    lowStock: 0,
  });
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch products for stats
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          const products = data.products || [];

          // Calculate stats
          let totalVariants = 0;
          let lowStockCount = 0;

          products.forEach(product => {
            if (product.variants) {
              totalVariants += product.variants.length;
              product.variants.forEach(v => {
                if (v.stock <= 5) lowStockCount++;
              });
            }
          });

          setStats({
            products: products.length,
            orders: 0, // Will come from orders API later
            revenue: 0, // Will come from Stripe later
            lowStock: lowStockCount,
          });

          setRecentProducts(products.slice(0, 5));
        }
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
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Products</div>
          <div className={`${styles.statValue} ${styles.statAccent}`}>{stats.products}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Orders</div>
          <div className={styles.statValue}>{stats.orders}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Revenue</div>
          <div className={styles.statValue}>${stats.revenue.toLocaleString()}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Low Stock Items</div>
          <div className={styles.statValue} style={{ color: stats.lowStock > 0 ? '#ef4444' : 'inherit' }}>
            {stats.lowStock}
          </div>
        </div>
      </div>

      {/* Recent Products */}
      <div className={styles.pageHeader} style={{ marginTop: 'var(--space-xl)' }}>
        <div>
          <h2 className={styles.pageTitle} style={{ fontSize: 'var(--font-size-xl)' }}>RECENT PRODUCTS</h2>
        </div>
        <Link href="/admin/products" className={styles.secondaryButton}>
          View All
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {recentProducts.length > 0 ? (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Variants</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      {product.images?.[0]?.url ? (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className={styles.productThumb}
                        />
                      ) : (
                        <div className={styles.productThumb} />
                      )}
                      <span style={{ fontWeight: 500 }}>{product.name}</span>
                    </div>
                  </td>
                  <td>${product.basePrice?.toFixed(2) || product.price?.toFixed(2) || '0.00'}</td>
                  <td>{product.variants?.length || 0} variants</td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>
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
              <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <h3 className={styles.emptyTitle}>No products yet</h3>
            <p className={styles.emptyText}>Add your first product to get started</p>
            <Link href="/admin/products/new" className={styles.primaryButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Product
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
