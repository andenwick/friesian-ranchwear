'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import OrderCard from '../../components/OrderCard/OrderCard';
import styles from './page.module.css';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Orders' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

export default function AccountOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/account/orders');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchOrders();
    }
  }, [statusFilter, status]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const url = statusFilter === 'all'
        ? '/api/account/orders'
        : `/api/account/orders?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter by search query (order number)
  const filteredOrders = orders.filter(order =>
    !searchQuery || order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show loading while auth state resolves (prevents content flash before redirect)
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className={styles.page}>
        <Header alwaysVisible={true} />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.loading}>
              <span>Loading...</span>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header alwaysVisible={true} />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>YOUR ORDERS</h1>
              {session?.user?.name && (
                <p className={styles.subtitle}>
                  Welcome back, {session.user.name}
                </p>
              )}
            </div>
          </div>

          <div className={styles.filters}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.select}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #"
              className={styles.search}
            />
          </div>

          {loading ? (
            <div className={styles.loading}>
              <span>Loading orders...</span>
            </div>
          ) : filteredOrders.length > 0 ? (
            <>
              <p className={styles.resultCount}>
                {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
              </p>
              <div className={styles.ordersList}>
                {filteredOrders.map((order) => (
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
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Your order history will appear here once you make a purchase.'
                }
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
