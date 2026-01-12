'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../admin.module.css';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setProducts(products.filter(p => p.id !== productId));
      } else {
        alert('Failed to delete product');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete product');
    }
  };

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
          <h1 className={styles.pageTitle}>PRODUCTS</h1>
          <p className={styles.pageSubtitle}>{products.length} products in catalog</p>
        </div>
        <Link href="/admin/products/new" className={styles.primaryButton}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Product
        </Link>
      </div>

      {products.length > 0 ? (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Variants</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const totalStock = product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
                const isLowStock = product.variants?.some(v => v.stock <= 5);

                return (
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
                        <div>
                          <div style={{ fontWeight: 500 }}>{product.name}</div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--foreground-muted)' }}>
                            {product.description?.substring(0, 50)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>${product.basePrice?.toFixed(2) || product.price?.toFixed(2) || '0.00'}</td>
                    <td>{product.variants?.length || 0}</td>
                    <td>
                      <span style={{ color: isLowStock ? '#ef4444' : 'inherit' }}>
                        {totalStock}
                      </span>
                    </td>
                    <td>
                      {totalStock === 0 ? (
                        <span className={`${styles.badge} ${styles.badgeOutOfStock}`}>Out of Stock</span>
                      ) : isLowStock ? (
                        <span className={`${styles.badge} ${styles.badgeDraft}`}>Low Stock</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeActive}`}>In Stock</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link
                          href={`/admin/products/${product.id}`}
                          className={styles.actionButton}
                          title="Edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                          title="Delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
            <p className={styles.emptyText}>Start building your catalog by adding your first product</p>
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
