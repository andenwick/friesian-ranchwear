'use client';

import { useState, useEffect } from 'react';
import styles from './ProductFilters.module.css';

export default function ProductFilters({
  products,
  onFilterChange,
  activeFilters,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract unique categories and sizes from products
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const allSizes = [...new Set(products.flatMap(p => p.sizes || []))];

  // Sort sizes in logical order
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
  const sortedSizes = allSizes.sort((a, b) => {
    const aIndex = sizeOrder.indexOf(a.toUpperCase());
    const bIndex = sizeOrder.indexOf(b.toUpperCase());
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const handleCategoryChange = (category) => {
    onFilterChange({
      ...activeFilters,
      category: activeFilters.category === category ? null : category,
    });
  };

  const handleSizeToggle = (size) => {
    const currentSizes = activeFilters.sizes || [];
    const newSizes = currentSizes.includes(size)
      ? currentSizes.filter(s => s !== size)
      : [...currentSizes, size];

    onFilterChange({
      ...activeFilters,
      sizes: newSizes,
    });
  };

  const handlePriceChange = (type, value) => {
    onFilterChange({
      ...activeFilters,
      [type]: value ? parseFloat(value) : null,
    });
  };

  const clearAllFilters = () => {
    onFilterChange({
      category: null,
      sizes: [],
      minPrice: null,
      maxPrice: null,
    });
  };

  const hasActiveFilters =
    activeFilters.category ||
    (activeFilters.sizes && activeFilters.sizes.length > 0) ||
    activeFilters.minPrice ||
    activeFilters.maxPrice;

  return (
    <div className={styles.filters}>
      {/* Mobile Toggle */}
      <button
        className={styles.mobileToggle}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className={styles.toggleText}>
          Filters
          {hasActiveFilters && (
            <span className={styles.activeCount}>
              {[
                activeFilters.category ? 1 : 0,
                activeFilters.sizes?.length || 0,
                activeFilters.minPrice || activeFilters.maxPrice ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </span>
          )}
        </span>
        <svg
          className={`${styles.toggleIcon} ${isExpanded ? styles.expanded : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Filter Content */}
      <div className={`${styles.filterContent} ${isExpanded ? styles.show : ''}`}>
        {/* Categories */}
        {categories.length > 0 && (
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Category</span>
            <div className={styles.pillGroup}>
              {categories.map(category => (
                <button
                  key={category}
                  className={`${styles.pill} ${
                    activeFilters.category === category ? styles.active : ''
                  }`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sizes */}
        {sortedSizes.length > 0 && (
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Size</span>
            <div className={styles.pillGroup}>
              {sortedSizes.map(size => (
                <button
                  key={size}
                  className={`${styles.sizePill} ${
                    activeFilters.sizes?.includes(size) ? styles.active : ''
                  }`}
                  onClick={() => handleSizeToggle(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Price Range */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Price</span>
          <div className={styles.priceInputs}>
            <div className={styles.priceField}>
              <span className={styles.priceCurrency}>$</span>
              <input
                type="number"
                placeholder="Min"
                value={activeFilters.minPrice || ''}
                onChange={(e) => handlePriceChange('minPrice', e.target.value)}
                className={styles.priceInput}
                min="0"
              />
            </div>
            <span className={styles.priceDivider}>—</span>
            <div className={styles.priceField}>
              <span className={styles.priceCurrency}>$</span>
              <input
                type="number"
                placeholder="Max"
                value={activeFilters.maxPrice || ''}
                onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
                className={styles.priceInput}
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Clear All */}
        {hasActiveFilters && (
          <button className={styles.clearButton} onClick={clearAllFilters}>
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
