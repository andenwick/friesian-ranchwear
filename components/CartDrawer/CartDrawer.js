'use client';

import { useEffect } from 'react';
import Image from 'next/image';
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
    clearCart,
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
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>YOUR CART</h2>
          <button
            onClick={closeCart}
            className={styles.closeButton}
            aria-label="Close cart"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {items.length === 0 ? (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <p className={styles.emptyText}>Your cart is empty</p>
              <button onClick={closeCart} className={styles.continueButton}>
                Continue Shopping
              </button>
            </div>
          ) : (
            <ul className={styles.itemList}>
              {items.map((item) => (
                <li key={item.key} className={styles.item}>
                  <div className={styles.itemImage}>
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={80}
                        height={80}
                        className={styles.image}
                      />
                    ) : (
                      <div className={styles.imagePlaceholder} />
                    )}
                  </div>

                  <div className={styles.itemDetails}>
                    <h3 className={styles.itemName}>{item.name}</h3>
                    {(item.size || item.color) && (
                      <p className={styles.itemVariant}>
                        {[item.size, item.color].filter(Boolean).join(' / ')}
                      </p>
                    )}
                    <p className={styles.itemPrice}>${item.price.toFixed(2)}</p>

                    <div className={styles.itemActions}>
                      <div className={styles.quantityControl}>
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          className={styles.quantityButton}
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className={styles.quantityValue}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          className={styles.quantityButton}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.key)}
                        className={styles.removeButton}
                        aria-label="Remove item"
                      >
                        Remove
                      </button>
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
            <div className={styles.subtotal}>
              <span>Subtotal</span>
              <span className={styles.subtotalValue}>${subtotal.toFixed(2)}</span>
            </div>
            <p className={styles.shippingNote}>Shipping calculated at checkout</p>

            <button className={styles.checkoutButton}>
              Checkout
            </button>

            <button onClick={closeCart} className={styles.continueLink}>
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
