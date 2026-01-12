'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../../admin.module.css';

// Convert Google Drive URLs to thumbnail format
function convertImageUrl(url) {
  if (!url) return null;
  if (url.includes('drive.google.com')) {
    let fileId = null;
    if (url.includes('/file/d/')) {
      fileId = url.match(/\/d\/([^/]+)/)?.[1];
    } else if (url.includes('id=')) {
      fileId = url.match(/id=([^&]+)/)?.[1];
    }
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`;
    }
  }
  return url;
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending', color: '#f59e0b' },
  { value: 'PAID', label: 'Paid', color: '#10b981' },
  { value: 'PROCESSING', label: 'Processing', color: '#3b82f6' },
  { value: 'SHIPPED', label: 'Shipped', color: '#8b5cf6' },
  { value: 'DELIVERED', label: 'Delivered', color: '#10b981' },
  { value: 'CANCELLED', label: 'Cancelled', color: '#ef4444' },
  { value: 'REFUNDED', label: 'Refunded', color: '#6b7280' },
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  async function fetchOrder() {
    try {
      const res = await fetch(`/api/admin/orders/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        setError('Order not found');
      }
    } catch (err) {
      setError('Failed to load order');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setOrder({ ...order, status: newStatus });
      } else {
        alert('Failed to update status');
      }
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer} style={{ minHeight: '50vh', background: 'transparent' }}>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div>
        <div className={styles.pageHeader}>
          <Link href="/admin/orders" className={styles.secondaryButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Orders
          </Link>
        </div>
        <div className={styles.tableContainer}>
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>{error || 'Order not found'}</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <Link href="/admin/orders" style={{ color: 'var(--foreground-muted)', textDecoration: 'none', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Orders
          </Link>
          <h1 className={styles.pageTitle}>ORDER #{order.orderNumber}</h1>
          <p className={styles.pageSubtitle}>Placed on {formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-xl)' }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Order Items */}
          <div className={styles.tableContainer} style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-md)' }}>ORDER ITEMS</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Size</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        {(() => {
                          const imgUrl = convertImageUrl(item.imageUrl);
                          return imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={item.productName}
                              className={styles.productThumb}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={styles.productThumb} />
                          );
                        })()}
                        <span style={{ fontWeight: 500 }}>{item.productName}</span>
                      </div>
                    </td>
                    <td>{item.size || '-'}</td>
                    <td>{item.quantity}</td>
                    <td>${item.unitPrice.toFixed(2)}</td>
                    <td style={{ fontWeight: 500 }}>${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Shipping Address */}
          <div className={styles.tableContainer} style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-md)' }}>SHIPPING ADDRESS</h3>
            {order.shippingAddress?.street ? (
              <div style={{ lineHeight: 1.6 }}>
                <div style={{ fontWeight: 500 }}>{order.shippingAddress.name}</div>
                <div>{order.shippingAddress.street}</div>
                {order.shippingAddress.street2 && <div>{order.shippingAddress.street2}</div>}
                <div>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</div>
                <div>{order.shippingAddress.country}</div>
              </div>
            ) : (
              <p style={{ color: 'var(--foreground-muted)' }}>No shipping address</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Status Update */}
          <div className={styles.tableContainer} style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-md)' }}>STATUS</h3>
            <select
              value={order.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={updating}
              style={{
                width: '100%',
                background: 'var(--color-charcoal)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                padding: '12px',
                color: 'var(--foreground)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
              }}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Customer Info */}
          <div className={styles.tableContainer} style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-md)' }}>CUSTOMER</h3>
            <div style={{ lineHeight: 1.8 }}>
              <div style={{ fontWeight: 500 }}>{order.customerName}</div>
              <div style={{ color: 'var(--foreground-muted)' }}>{order.customerEmail}</div>
              {order.customerPhone && <div style={{ color: 'var(--foreground-muted)' }}>{order.customerPhone}</div>}
            </div>
          </div>

          {/* Order Summary */}
          <div className={styles.tableContainer} style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-md)' }}>SUMMARY</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--foreground-muted)' }}>Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--foreground-muted)' }}>Shipping</span>
                <span>${order.shipping.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--foreground-muted)' }}>Tax</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', fontWeight: 500 }}>
                <span>Total</span>
                <span style={{ color: 'var(--color-accent)' }}>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          {order.stripePaymentId && (
            <div className={styles.tableContainer} style={{ padding: 'var(--space-lg)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-md)' }}>PAYMENT</h3>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--foreground-muted)', wordBreak: 'break-all' }}>
                {order.stripePaymentId}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
