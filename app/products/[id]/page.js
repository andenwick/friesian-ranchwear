'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header/Header';
import Footer from '@/app/components/Footer/Footer';
import { useCart } from '@/lib/cart-context';
import styles from './page.module.css';

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

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [sizeError, setSizeError] = useState(false);

  // Fetch product
  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(`/api/products?id=${params.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Product not found');
          } else {
            throw new Error('Failed to fetch product');
          }
          return;
        }
        const data = await response.json();
        setProduct(data);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Unable to load product');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const handleAddToCart = () => {
    if (!product) return;

    // Validate size selection if product has sizes
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setSizeError(true);
      return;
    }

    setIsAdding(true);

    const priceNum = parseFloat(product.price.replace(/[^0-9.]/g, '')) || 0;

    addItem({
      id: product.id,
      name: product.name,
      price: priceNum,
      image: convertDriveUrl(product.imageUrl),
      size: selectedSize,
    }, null, quantity);

    // Brief visual feedback
    setTimeout(() => {
      setIsAdding(false);
    }, 600);
  };

  // Clear size error when size is selected
  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    setSizeError(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <Header alwaysVisible={true} />
        <main className={styles.page}>
          <div className={styles.container}>
            <div className={styles.layout}>
              <div className={styles.imageSection}>
                <div className={styles.skeletonImage} />
              </div>
              <div className={styles.detailsSection}>
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonPrice} />
                <div className={styles.skeletonDescription} />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.pageWrapper}>
        <Header alwaysVisible={true} />
        <main className={styles.page}>
          <div className={styles.container}>
            <div className={styles.errorState}>
              <h1 className={styles.errorTitle}>{error}</h1>
              <Link href="/products" className={styles.backButton}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Products
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className={styles.pageWrapper}>
      <Header alwaysVisible={true} />
      <main className={styles.page}>
        <div className={styles.container}>
          {/* Back Link */}
          <Link href="/products" className={styles.backLink}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Back to Collection</span>
          </Link>

          <div className={styles.layout}>
            {/* Image Section */}
            <div className={styles.imageSection}>
              <div className={styles.imageWrapper}>
                {product.imageUrl ? (
                  <img
                    src={convertDriveUrl(product.imageUrl)}
                    alt={product.name}
                    className={styles.productImage}
                  />
                ) : (
                  <div className={styles.imagePlaceholder}>
                    <span>No Image Available</span>
                  </div>
                )}
              </div>
            </div>

            {/* Details Section */}
            <div className={styles.detailsSection}>
              {product.category && (
                <span className={styles.category}>{product.category}</span>
              )}

              <h1 className={styles.productName}>{product.name}</h1>

              <p className={styles.productPrice}>{product.price}</p>

              {product.description && (
                <p className={styles.productDescription}>{product.description}</p>
              )}

              {/* Features / Bullet Points */}
              {product.features && product.features.length > 0 && (
                <ul className={styles.featuresList}>
                  {product.features.map((feature, index) => (
                    <li key={index} className={styles.featureItem}>
                      <span className={styles.featureBullet}>•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              )}

              {/* Size Selector */}
              {product.sizes && product.sizes.length > 0 && (
                <div className={`${styles.sizeSection} ${sizeError ? styles.sizeError : ''}`}>
                  <span className={styles.sizeLabel}>
                    Size <span className={styles.required}>*</span>
                  </span>
                  <div className={styles.sizeOptions}>
                    {product.sizes.map(size => (
                      <button
                        key={size}
                        className={`${styles.sizeButton} ${
                          selectedSize === size ? styles.selected : ''
                        }`}
                        onClick={() => handleSizeSelect(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  {sizeError && (
                    <span className={styles.sizeErrorMessage}>Please select a size</span>
                  )}
                </div>
              )}

              {/* Quantity Selector */}
              <div className={styles.quantitySection}>
                <span className={styles.quantityLabel}>Quantity</span>
                <div className={styles.quantityControl}>
                  <button
                    className={styles.quantityButton}
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <span className={styles.quantityValue}>{quantity}</span>
                  <button
                    className={styles.quantityButton}
                    onClick={() => setQuantity(q => Math.min(10, q + 1))}
                    disabled={quantity >= 10}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                className={`${styles.addToCartButton} ${isAdding ? styles.adding : ''}`}
                onClick={handleAddToCart}
                disabled={isAdding}
              >
                <span className={styles.buttonText}>
                  {isAdding ? 'Added!' : 'Add to Cart'}
                </span>
                {!isAdding && (
                  <svg
                    className={styles.buttonIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                )}
                {isAdding && (
                  <svg
                    className={styles.checkIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>

              {/* Additional Info */}
              <div className={styles.additionalInfo}>
                <div className={styles.infoItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>Free shipping on orders over $100</span>
                </div>
                <div className={styles.infoItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <span>Questions? Contact us anytime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
