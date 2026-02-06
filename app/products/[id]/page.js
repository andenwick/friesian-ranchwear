'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Header from '@/app/components/Header/Header';
import Footer from '@/app/components/Footer/Footer';
import ColorSwatch from '@/app/components/ColorSwatch/ColorSwatch';
import StarRating from '@/app/components/StarRating/StarRating';
import ReviewCard from '@/app/components/ReviewCard/ReviewCard';
import ReviewForm from '@/app/components/ReviewForm/ReviewForm';
import { useCart } from '@/lib/cart-context';
import { convertDriveUrl } from '@/lib/image-utils';
import styles from './page.module.css';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const { data: session } = useSession();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [colorError, setColorError] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [canReview, setCanReview] = useState(false);

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

  // Fetch reviews
  useEffect(() => {
    async function fetchReviews() {
      if (!params.id) return;
      try {
        const res = await fetch(`/api/products/${params.id}/reviews`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data.reviews || []);
          setAverageRating(data.averageRating || 0);
          setReviewCount(data.reviewCount || 0);
        }
      } catch (err) {
        console.error('Error fetching reviews:', err);
      }
    }

    fetchReviews();
  }, [params.id]);

  // Check if user can submit a review (logged in and has purchased)
  useEffect(() => {
    async function checkCanReview() {
      if (!session?.user || !params.id) {
        setCanReview(false);
        return;
      }
      // User is logged in, they can try to submit (API will verify purchase)
      setCanReview(true);
    }

    checkCanReview();
  }, [session, params.id]);

  // Extract unique colors from variants
  const colors = product?.variants
    ? [...new Set(product.variants.map(v => v.color).filter(Boolean))]
    : [];

  // Get available colors for selected size (in stock)
  const getAvailableColors = () => {
    if (!product?.variants || !selectedSize) return colors;
    return product.variants
      .filter(v => v.size === selectedSize && v.stock > 0)
      .map(v => v.color)
      .filter(Boolean);
  };

  // Get available sizes for selected color (in stock)
  const getAvailableSizes = () => {
    if (!product?.variants || !selectedColor) return product?.sizes || [];
    return product.variants
      .filter(v => v.color === selectedColor && v.stock > 0)
      .map(v => v.size)
      .filter(Boolean);
  };

  const handleAddToCart = () => {
    if (!product) return;

    // Validate size selection if product has sizes
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setSizeError(true);
      return;
    }

    // Validate color selection if product has colors
    if (colors.length > 0 && !selectedColor) {
      setColorError(true);
      return;
    }

    setIsAdding(true);

    // Find the matching variant based on selected size and color
    const selectedVariant = product.variants?.find(
      v => v.size === selectedSize && v.color === selectedColor
    );

    addItem(product, selectedVariant, quantity);

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

  // Clear color error when color is selected
  const handleColorSelect = (color) => {
    setSelectedColor(color);
    setColorError(false);
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
                {product.imageUrls && product.imageUrls.length > 0 ? (
                  <img
                    src={convertDriveUrl(product.imageUrls[selectedImageIndex])}
                    alt={`${product.name} - Image ${selectedImageIndex + 1}`}
                    className={styles.productImage}
                  />
                ) : product.imageUrl ? (
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

              {/* Thumbnail Navigation */}
              {product.imageUrls && product.imageUrls.length > 1 && (
                <div className={styles.thumbnailNav}>
                  {product.imageUrls.map((url, index) => (
                    <button
                      key={index}
                      className={`${styles.thumbnail} ${selectedImageIndex === index ? styles.thumbnailActive : ''}`}
                      onClick={() => setSelectedImageIndex(index)}
                      aria-label={`View image ${index + 1}`}
                    >
                      <img
                        src={convertDriveUrl(url)}
                        alt={`${product.name} thumbnail ${index + 1}`}
                      />
                    </button>
                  ))}
                </div>
              )}
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
                    {product.sizes.map(size => {
                      const availableSizes = getAvailableSizes();
                      const isAvailable = !selectedColor || availableSizes.includes(size);
                      return (
                        <button
                          key={size}
                          className={`${styles.sizeButton} ${
                            selectedSize === size ? styles.selected : ''
                          } ${!isAvailable ? styles.unavailable : ''}`}
                          onClick={() => isAvailable && handleSizeSelect(size)}
                          disabled={!isAvailable}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                  {sizeError && (
                    <span className={styles.sizeErrorMessage}>Please select a size</span>
                  )}
                </div>
              )}

              {/* Color Selector */}
              {colors.length > 0 && (
                <div className={`${styles.colorSection} ${colorError ? styles.colorError : ''}`}>
                  <ColorSwatch
                    colors={colors}
                    selectedColor={selectedColor}
                    onSelect={handleColorSelect}
                    availableColors={getAvailableColors()}
                  />
                  {colorError && (
                    <span className={styles.colorErrorMessage}>Please select a color</span>
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
                  <span>Free shipping on orders over $50</span>
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

          {/* Reviews Section */}
          <div className={styles.reviewsSection}>
            <div className={styles.reviewsHeader}>
              <h2 className={styles.reviewsTitle}>Customer Reviews</h2>
              {reviewCount > 0 && (
                <div className={styles.reviewsSummary}>
                  <StarRating rating={averageRating} readonly size="medium" />
                  <span className={styles.reviewsAverage}>{averageRating.toFixed(1)}</span>
                  <span className={styles.reviewsCount}>({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
                </div>
              )}
            </div>

            {/* Review Form - only for eligible users */}
            {canReview && (
              <div className={styles.reviewFormWrapper}>
                <ReviewForm
                  productId={params.id}
                  onSubmit={() => {
                    // Refresh reviews after submission
                    fetch(`/api/products/${params.id}/reviews`)
                      .then(res => res.json())
                      .then(data => {
                        setReviews(data.reviews || []);
                        setAverageRating(data.averageRating || 0);
                        setReviewCount(data.reviewCount || 0);
                      });
                  }}
                />
              </div>
            )}

            {/* Reviews List */}
            {reviews.length > 0 ? (
              <div className={styles.reviewsList}>
                {reviews.map(review => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <p className={styles.noReviews}>No reviews yet. Be the first to share your experience!</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
