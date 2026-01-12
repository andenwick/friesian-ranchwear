'use client';

import { useState } from 'react';
import StatusBadge from '../StatusBadge/StatusBadge';
import styles from './OrderCard.module.css';

export default function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={styles.card}>
      <button
        className={styles.header}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className={styles.headerLeft}>
          <span className={styles.orderNumber}>#{order.orderNumber}</span>
          <StatusBadge status={order.status} />
        </div>
        <div className={styles.headerRight}>
          <span className={styles.date}>{formatDate(order.createdAt)}</span>
          <span className={styles.total}>${order.total.toFixed(2)}</span>
          <svg
            className={`${styles.chevron} ${expanded ? styles.chevronUp : ''}`}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className={styles.details}>
          {/* Items */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>ITEMS</h4>
            <div className={styles.items}>
              {order.items.map((item) => (
                <div key={item.id} className={styles.item}>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className={styles.itemImage}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={styles.itemImagePlaceholder} />
                  )}
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.productName}</span>
                    <span className={styles.itemMeta}>
                      {item.size && `Size: ${item.size}`}
                      {item.size && item.color && ' · '}
                      {item.color && `Color: ${item.color}`}
                    </span>
                  </div>
                  <div className={styles.itemPrice}>
                    <span className={styles.itemQty}>Qty: {item.quantity}</span>
                    <span className={styles.itemTotal}>${item.total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address */}
          {order.shippingAddress?.street && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>SHIPPING ADDRESS</h4>
              <div className={styles.address}>
                <div>{order.shippingAddress.name}</div>
                <div>{order.shippingAddress.street}</div>
                {order.shippingAddress.street2 && <div>{order.shippingAddress.street2}</div>}
                <div>
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
                </div>
                <div>{order.shippingAddress.country}</div>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>SUMMARY</h4>
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Shipping</span>
                <span>${order.shipping.toFixed(2)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Tax</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
