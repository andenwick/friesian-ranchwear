'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/app/components/Header/Header';
import Footer from '@/app/components/Footer/Footer';
import ProductCard from '@/app/components/ProductCard/ProductCard';
import ProductFilters from '@/app/components/ProductFilters/ProductFilters';
import styles from './page.module.css';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: null,
    sizes: [],
    minPrice: null,
    maxPrice: null,
  });

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products?display=products');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Unable to load products');
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Apply filters to products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Category filter
      if (filters.category && product.category !== filters.category) {
        return false;
      }

      // Size filter - product must have at least one of the selected sizes
      if (filters.sizes.length > 0) {
        const productSizes = product.sizes || [];
        const hasMatchingSize = filters.sizes.some(size =>
          productSizes.some(ps => ps.toLowerCase() === size.toLowerCase())
        );
        if (!hasMatchingSize) return false;
      }

      // Price filter
      const priceNum = parseFloat(product.price.replace(/[^0-9.]/g, '')) || 0;
      if (filters.minPrice && priceNum < filters.minPrice) return false;
      if (filters.maxPrice && priceNum > filters.maxPrice) return false;

      return true;
    });
  }, [products, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <Header alwaysVisible={true} />
        <main className={styles.page}>
          <div className={styles.container}>
            <header className={styles.header}>
              <h1 className={styles.title}>Shop</h1>
              <p className={styles.subtitle}>Friesian Ranchwear Collection</p>
            </header>
            <div className={styles.grid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div className={styles.skeletonImage} />
                  <div className={styles.skeletonContent}>
                    <div className={styles.skeletonText} />
                    <div className={styles.skeletonTextShort} />
                  </div>
                </div>
              ))}
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
            <header className={styles.header}>
              <h1 className={styles.title}>Shop</h1>
            </header>
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>{error}</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <Header alwaysVisible={true} />
      <main className={styles.page}>
        <div className={styles.container}>
          {/* Page Header */}
          <header className={styles.header}>
            <h1 className={styles.title}>Shop</h1>
            <p className={styles.subtitle}>Friesian Ranchwear Collection</p>
          </header>

          {/* Filters */}
          <ProductFilters
            products={products}
            onFilterChange={handleFilterChange}
            activeFilters={filters}
            resultCount={filteredProducts.length}
          />

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>No products match your filters</p>
              <button
                className={styles.clearFiltersButton}
                onClick={() => setFilters({
                  category: null,
                  sizes: [],
                  minPrice: null,
                  maxPrice: null,
                })}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} showLink={true} />
              ))}
            </div>
          )}
        </div>

        {/* Decorative elements */}
        <div className={styles.gridLines} aria-hidden="true" />
      </main>
      <Footer />
    </div>
  );
}
