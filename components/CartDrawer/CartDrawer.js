'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/lib/cart-context';
import styles from './CartDrawer.module.css';

export default function CartDrawer() {
  const {
    items,
    itemCount,
    subtotal,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
  } = useCart();

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeCart();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeCart]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ''}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-label="Shopping cart"
        aria-modal="true"
      >
        {/* Gold accent line */}
        <div className={styles.accentLine} aria-hidden="true" />

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>Your Cart</h2>
            {itemCount > 0 && (
              <span className={styles.itemBadge}>{itemCount}</span>
            )}
          </div>
          <button
            onClick={closeCart}
            className={styles.closeButton}
            aria-label="Close cart"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {items.length === 0 ? (
            <div className={styles.emptyState}>
              {/* Elegant empty cart illustration */}
              <div className={styles.emptyIllustration}>
                <svg viewBox="0 0 120 120" fill="none">
                  <circle cx="60" cy="60" r="58" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
                  <circle cx="60" cy="60" r="40" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
                  <path
                    d="M40 45h40l-5 30H45l-5-30z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    opacity="0.6"
                  />
                  <circle cx="48" cy="82" r="3" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
                  <circle cx="72" cy="82" r="3" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
                  <path
                    d="M40 45l-5-10h-8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    opacity="0.6"
                  />
                  <path
                    d="M55 55v10M65 55v10"
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.3"
                    strokeDasharray="2 2"
                  />
                </svg>
              </div>

              <h3 className={styles.emptyTitle}>Your cart is empty</h3>
              <p className={styles.emptyText}>
                Discover our premium western ranchwear collection
              </p>

              <Link
                href="/products"
                className={styles.browseButton}
                onClick={closeCart}
              >
                <span>Browse Collection</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : (
            <ul className={styles.itemList}>
              {items.map((item, index) => (
                <li
                  key={item.key}
                  className={styles.item}
                  style={{ '--item-index': index }}
                >
                  <div className={styles.itemImage}>
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={100}
                        height={120}
                        className={styles.image}
                      />
                    ) : (
                      <div className={styles.imagePlaceholder}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className={styles.itemDetails}>
                    <div className={styles.itemHeader}>
                      <h3 className={styles.itemName}>{item.name}</h3>
                      <button
                        onClick={() => removeItem(item.key)}
                        className={styles.removeButton}
                        aria-label="Remove item"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {(item.size || item.color) && (
                      <p className={styles.itemVariant}>
                        {[item.size, item.color].filter(Boolean).join(' / ')}
                      </p>
                    )}

                    <div className={styles.itemFooter}>
                      <div className={styles.quantityControl}>
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          className={styles.quantityButton}
                          aria-label="Decrease quantity"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14" />
                          </svg>
                        </button>
                        <span className={styles.quantityValue}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          className={styles.quantityButton}
                          aria-label="Increase quantity"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                      </div>

                      <p className={styles.itemPrice}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Subtotal</span>
                <span className={styles.summaryValue}>${subtotal.toFixed(2)}</span>
              </div>
              <p className={styles.shippingNote}>
                Shipping & taxes calculated at checkout
              </p>
            </div>

            <button className={styles.checkoutButton}>
              <span className={styles.checkoutText}>Proceed to Checkout</span>
              <span className={styles.checkoutIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </button>

            <div className={styles.footerLinks}>
              <Link
                href="/products"
                className={styles.continueLink}
                onClick={closeCart}
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
