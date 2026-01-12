'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './ProductFilters.module.css';

export default function ProductFilters({
  products,
  onFilterChange,
  activeFilters,
  resultCount,
}) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const categoryRef = useRef(null);

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

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategoryChange = (category) => {
    onFilterChange({
      ...activeFilters,
      category: activeFilters.category === category ? null : category,
    });
    setCategoryOpen(false);
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
    setMobileOpen(false);
  };

  const hasActiveFilters =
    activeFilters.category ||
    (activeFilters.sizes && activeFilters.sizes.length > 0) ||
    activeFilters.minPrice ||
    activeFilters.maxPrice;

  const activeFilterCount = [
    activeFilters.category ? 1 : 0,
    activeFilters.sizes?.length || 0,
    activeFilters.minPrice || activeFilters.maxPrice ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className={styles.filterBar}>
      {/* Mobile Filter Toggle */}
      <button
        className={styles.mobileToggle}
        onClick={() => setMobileOpen(true)}
        aria-expanded={mobileOpen}
      >
        <svg className={styles.filterIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 6h18M6 12h12M9 18h6" />
        </svg>
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className={styles.badge}>{activeFilterCount}</span>
        )}
      </button>

      {/* Results Count - Mobile */}
      <span className={styles.mobileResults}>
        {resultCount} {resultCount === 1 ? 'Product' : 'Products'}
      </span>

      {/* Mobile Drawer Backdrop */}
      <div
        className={`${styles.backdrop} ${mobileOpen ? styles.backdropVisible : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Filter Content (Desktop inline / Mobile drawer) */}
      <div className={`${styles.filterContent} ${mobileOpen ? styles.drawerOpen : ''}`}>
        {/* Mobile Drawer Header */}
        <div className={styles.drawerHeader}>
          <h3 className={styles.drawerTitle}>Filters</h3>
          <button
            className={styles.drawerClose}
            onClick={() => setMobileOpen(false)}
            aria-label="Close filters"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Category Dropdown */}
        <div className={styles.filterGroup} ref={categoryRef}>
          <span className={styles.filterLabel}>Category</span>
          <button
            className={`${styles.dropdown} ${activeFilters.category ? styles.active : ''} ${categories.length === 0 ? styles.disabled : ''}`}
            onClick={() => categories.length > 0 && setCategoryOpen(!categoryOpen)}
            aria-expanded={categoryOpen}
            disabled={categories.length === 0}
          >
            <span>{activeFilters.category || (categories.length === 0 ? 'No categories' : 'All Categories')}</span>
            <svg
              className={`${styles.dropdownIcon} ${categoryOpen ? styles.open : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {categoryOpen && categories.length > 0 && (
            <div className={styles.dropdownMenu}>
              <button
                className={`${styles.dropdownItem} ${!activeFilters.category ? styles.selected : ''}`}
                onClick={() => handleCategoryChange(null)}
              >
                All Categories
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  className={`${styles.dropdownItem} ${activeFilters.category === category ? styles.selected : ''}`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Size Pills - Only show if sizes exist */}
        {sortedSizes.length > 0 && (
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Size</span>
            <div className={styles.sizeRow}>
              {sortedSizes.map(size => (
                <button
                  key={size}
                  className={`${styles.sizePill} ${
                    activeFilters.sizes?.includes(size) ? styles.active : ''
                  }`}
                  onClick={() => handleSizeToggle(size)}
                  aria-pressed={activeFilters.sizes?.includes(size)}
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
          <div className={styles.priceRange}>
            <div className={styles.priceInput}>
              <span className={styles.currency}>$</span>
              <input
                type="number"
                placeholder="Min"
                value={activeFilters.minPrice || ''}
                onChange={(e) => handlePriceChange('minPrice', e.target.value)}
                min="0"
              />
            </div>
            <span className={styles.priceDash}></span>
            <div className={styles.priceInput}>
              <span className={styles.currency}>$</span>
              <input
                type="number"
                placeholder="Max"
                value={activeFilters.maxPrice || ''}
                onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Clear All - Mobile */}
        {hasActiveFilters && (
          <button className={styles.clearMobile} onClick={clearAllFilters}>
            Clear All Filters
          </button>
        )}

        {/* Mobile Apply Button */}
        <button
          className={styles.applyButton}
          onClick={() => setMobileOpen(false)}
        >
          View {resultCount} {resultCount === 1 ? 'Product' : 'Products'}
        </button>
      </div>

      {/* Desktop Results & Clear */}
      <div className={styles.desktopMeta}>
        <span className={styles.results}>
          {resultCount} {resultCount === 1 ? 'Product' : 'Products'}
        </span>
        {hasActiveFilters && (
          <button className={styles.clearButton} onClick={clearAllFilters}>
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
