'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart-context';
import styles from './ProductCard.module.css';

/**
 * Converts Google Drive share links to proxied image URLs.
 */
function convertDriveUrl(url) {
  if (!url) return url;
  if (url.startsWith('/api/image')) return url;
  if (url.startsWith('/')) return url;

  let fileId = null;
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) fileId = fileMatch[1];

  if (!fileId) {
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) fileId = idMatch[1];
  }

  if (fileId) return `/api/image?id=${fileId}`;
  return url;
}

export default function ProductCard({ product, showLink = true }) {
  const { addItem } = useCart();

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const priceNum = parseFloat(product.price.replace(/[^0-9.]/g, '')) || 0;

    addItem({
      id: product.id,
      name: product.name,
      price: priceNum,
      image: convertDriveUrl(product.imageUrl),
    });
  };

  const cardContent = (
    <>
      <div className={styles.imageContainer}>
        {product.imageUrl ? (
          <img
            src={convertDriveUrl(product.imageUrl)}
            alt={product.name}
            className={styles.image}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <span className={styles.placeholderText}>No Image</span>
          </div>
        )}
        <div className={styles.overlay} />
        <div className={styles.shine} />
      </div>

      <div className={styles.content}>
        <div className={styles.details}>
          {product.category && (
            <span className={styles.category}>{product.category}</span>
          )}
          <h3 className={styles.name}>{product.name}</h3>
          <p className={styles.price}>{product.price}</p>
        </div>

        <button
          className={styles.addButton}
          onClick={handleAddToCart}
          aria-label={`Add ${product.name} to cart`}
        >
          <span className={styles.buttonText}>Add to Cart</span>
          <svg
            className={styles.buttonIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </>
  );

  if (showLink) {
    return (
      <Link href={`/products/${product.id}`} className={styles.card}>
        {cardContent}
      </Link>
    );
  }

  return <div className={styles.card}>{cardContent}</div>;
}
