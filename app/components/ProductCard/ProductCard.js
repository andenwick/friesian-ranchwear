'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart-context';
import { convertDriveUrl } from '@/lib/image-utils';
import styles from './ProductCard.module.css';

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
      <div className={styles.imageWrap}>
        {product.imageUrl ? (
          <img
            src={convertDriveUrl(product.imageUrl)}
            alt={product.name}
            className={styles.image}
          />
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.placeholderText}>No Image</span>
          </div>
        )}
      </div>
      <div className={styles.info}>
        {product.category && (
          <span className={styles.category}>{product.category}</span>
        )}
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.price}>{product.price}</p>
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
