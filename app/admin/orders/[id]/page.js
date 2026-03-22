'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { convertImageUrl } from '@/lib/image-utils';
import styles from '../../admin.module.css';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
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
      <div className={`${styles.loadingContainer} ${styles.loadingInline}`}>
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
          <Link href="/admin/orders" className={styles.backLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Orders
          </Link>
          <h1 className={styles.pageTitle}>ORDER #{order.orderNumber}</h1>
          <p className={styles.pageSubtitle}>Placed on {formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className={styles.detailGrid}>
        {/* Main Content */}
        <div className={styles.stack}>
          {/* Order Items */}
          <div className={`${styles.tableContainer} ${styles.sectionCard}`}>
            <h3 className={styles.sectionTitle}>ORDER ITEMS</h3>
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
                      <div className={styles.inlineFlex}>
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
                        <span className={styles.textBold}>{item.productName}</span>
                      </div>
                    </td>
                    <td>{item.size || '-'}</td>
                    <td>{item.quantity}</td>
                    <td>${item.unitPrice.toFixed(2)}</td>
                    <td className={styles.textBold}>${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Shipping Address */}
          <div className={`${styles.tableContainer} ${styles.sectionCard}`}>
            <h3 className={styles.sectionTitle}>SHIPPING ADDRESS</h3>
            {order.shippingAddress?.street ? (
              <div className={styles.addressBlock}>
                <div className={styles.textBold}>{order.shippingAddress.name}</div>
                <div>{order.shippingAddress.street}</div>
                {order.shippingAddress.street2 && <div>{order.shippingAddress.street2}</div>}
                <div>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</div>
                <div>{order.shippingAddress.country}</div>
              </div>
            ) : (
              <p className={styles.textMuted}>No shipping address</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className={styles.stack}>
          {/* Status Update */}
          <div className={`${styles.tableContainer} ${styles.sectionCard}`}>
            <h3 className={styles.sectionTitle}>STATUS</h3>
            <select
              value={order.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={updating}
              className={styles.filterSelectFull}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Customer Info */}
          <div className={`${styles.tableContainer} ${styles.sectionCard}`}>
            <h3 className={styles.sectionTitle}>CUSTOMER</h3>
            <div className={styles.customerInfo}>
              <div className={styles.textBold}>{order.customerName}</div>
              <div className={styles.textMuted}>{order.customerEmail}</div>
              {order.customerPhone && <div className={styles.textMuted}>{order.customerPhone}</div>}
            </div>
          </div>

          {/* Order Summary */}
          <div className={`${styles.tableContainer} ${styles.sectionCard}`}>
            <h3 className={styles.sectionTitle}>SUMMARY</h3>
            <div className={styles.stack}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Shipping</span>
                <span>${order.shipping.toFixed(2)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Tax</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              <div className={`${styles.summaryRow} ${styles.summaryDivider}`}>
                <span>Total</span>
                <span className={styles.textAccent}>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          {order.stripePaymentId && (
            <div className={`${styles.tableContainer} ${styles.sectionCard}`}>
              <h3 className={styles.sectionTitle}>PAYMENT</h3>
              <div className={styles.paymentId}>
                {order.stripePaymentId}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
