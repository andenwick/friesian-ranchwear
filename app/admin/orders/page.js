'use client';

import Link from 'next/link';
import styles from '../admin.module.css';

export default function OrdersPage() {
  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>ORDERS</h1>
          <p className={styles.pageSubtitle}>Order management coming soon</p>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.emptyState}>
          <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="3" width="15" height="13" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          <h3 className={styles.emptyTitle}>Orders coming soon</h3>
          <p className={styles.emptyText}>
            Once Stripe checkout is configured, orders will appear here.
            <br />
            You can also view orders in your Stripe Dashboard.
          </p>
          <a
            href="https://dashboard.stripe.com/orders"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.secondaryButton}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open Stripe Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
