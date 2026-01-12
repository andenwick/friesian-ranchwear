'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../../admin.module.css';
import formStyles from './form.module.css';

export default function ProductForm() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [product, setProduct] = useState({
    name: '',
    description: '',
    basePrice: '',
    tikTokUrl: '',
    variants: [{ size: '', color: '', price: '', stock: '', sku: '' }],
    images: [{ url: '', alt: '' }],
  });

  useEffect(() => {
    if (!isNew) {
      fetchProduct();
    }
  }, [isNew, params.id]);

  async function fetchProduct() {
    try {
      const res = await fetch(`/api/admin/products/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setProduct({
          name: data.name || '',
          description: data.description || '',
          basePrice: data.basePrice?.toString() || '',
          tikTokUrl: data.tikTokUrl || '',
          variants: data.variants?.length > 0
            ? data.variants.map(v => ({
                id: v.id,
                size: v.size || '',
                color: v.color || '',
                price: v.price?.toString() || '',
                stock: v.stock?.toString() || '',
                sku: v.sku || '',
              }))
            : [{ size: '', color: '', price: '', stock: '', sku: '' }],
          images: data.images?.length > 0
            ? data.images.map(i => ({ id: i.id, url: i.url || '', alt: i.alt || '' }))
            : [{ url: '', alt: '' }],
        });
      } else {
        setError('Product not found');
      }
    } catch (err) {
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        name: product.name,
        description: product.description,
        basePrice: parseFloat(product.basePrice) || 0,
        tikTokUrl: product.tikTokUrl,
        variants: product.variants
          .filter(v => v.size || v.color)
          .map(v => ({
            id: v.id,
            size: v.size,
            color: v.color,
            price: v.price ? parseFloat(v.price) : null,
            stock: parseInt(v.stock) || 0,
            sku: v.sku,
          })),
        images: product.images
          .filter(i => i.url)
          .map(i => ({ id: i.id, url: i.url, alt: i.alt || product.name })),
      };

      const url = isNew ? '/api/admin/products' : `/api/admin/products/${params.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push('/admin/products');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save product');
      }
    } catch (err) {
      setError('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const addVariant = () => {
    setProduct({
      ...product,
      variants: [...product.variants, { size: '', color: '', price: '', stock: '', sku: '' }],
    });
  };

  const removeVariant = (index) => {
    setProduct({
      ...product,
      variants: product.variants.filter((_, i) => i !== index),
    });
  };

  const updateVariant = (index, field, value) => {
    const newVariants = [...product.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setProduct({ ...product, variants: newVariants });
  };

  const addImage = () => {
    setProduct({
      ...product,
      images: [...product.images, { url: '', alt: '' }],
    });
  };

  const removeImage = (index) => {
    setProduct({
      ...product,
      images: product.images.filter((_, i) => i !== index),
    });
  };

  const updateImage = (index, field, value) => {
    const newImages = [...product.images];
    newImages[index] = { ...newImages[index], [field]: value };
    setProduct({ ...product, images: newImages });
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
          <h1 className={styles.pageTitle}>{isNew ? 'ADD PRODUCT' : 'EDIT PRODUCT'}</h1>
          <p className={styles.pageSubtitle}>
            {isNew ? 'Create a new product for your catalog' : `Editing: ${product.name}`}
          </p>
        </div>
        <Link href="/admin/products" className={styles.secondaryButton}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Products
        </Link>
      </div>

      {error && <div className={formStyles.errorBanner}>{error}</div>}

      <form onSubmit={handleSubmit} className={formStyles.form}>
        {/* Basic Info */}
        <div className={formStyles.section}>
          <h2 className={formStyles.sectionTitle}>Basic Information</h2>
          <div className={formStyles.grid}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Product Name *</label>
              <input
                type="text"
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                className={formStyles.input}
                placeholder="e.g., Western Boot Cut Jeans"
                required
              />
            </div>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Base Price *</label>
              <div className={formStyles.inputWithPrefix}>
                <span className={formStyles.prefix}>$</span>
                <input
                  type="number"
                  step="0.01"
                  value={product.basePrice}
                  onChange={(e) => setProduct({ ...product, basePrice: e.target.value })}
                  className={formStyles.input}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          </div>

          <div className={formStyles.field}>
            <label className={formStyles.label}>Description</label>
            <textarea
              value={product.description}
              onChange={(e) => setProduct({ ...product, description: e.target.value })}
              className={formStyles.textarea}
              placeholder="Describe your product..."
              rows={4}
            />
          </div>

          <div className={formStyles.field}>
            <label className={formStyles.label}>TikTok Shop URL</label>
            <input
              type="url"
              value={product.tikTokUrl}
              onChange={(e) => setProduct({ ...product, tikTokUrl: e.target.value })}
              className={formStyles.input}
              placeholder="https://www.tiktok.com/..."
            />
          </div>
        </div>

        {/* Variants */}
        <div className={formStyles.section}>
          <div className={formStyles.sectionHeader}>
            <h2 className={formStyles.sectionTitle}>Variants</h2>
            <button type="button" onClick={addVariant} className={styles.secondaryButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Variant
            </button>
          </div>

          {product.variants.map((variant, index) => (
            <div key={index} className={formStyles.variantRow}>
              <div className={formStyles.variantGrid}>
                <div className={formStyles.field}>
                  <label className={formStyles.labelSmall}>Size</label>
                  <input
                    type="text"
                    value={variant.size}
                    onChange={(e) => updateVariant(index, 'size', e.target.value)}
                    className={formStyles.inputSmall}
                    placeholder="S, M, L, XL..."
                  />
                </div>
                <div className={formStyles.field}>
                  <label className={formStyles.labelSmall}>Color</label>
                  <input
                    type="text"
                    value={variant.color}
                    onChange={(e) => updateVariant(index, 'color', e.target.value)}
                    className={formStyles.inputSmall}
                    placeholder="Black, Brown..."
                  />
                </div>
                <div className={formStyles.field}>
                  <label className={formStyles.labelSmall}>Price Override</label>
                  <input
                    type="number"
                    step="0.01"
                    value={variant.price}
                    onChange={(e) => updateVariant(index, 'price', e.target.value)}
                    className={formStyles.inputSmall}
                    placeholder="Leave empty for base"
                  />
                </div>
                <div className={formStyles.field}>
                  <label className={formStyles.labelSmall}>Stock *</label>
                  <input
                    type="number"
                    value={variant.stock}
                    onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                    className={formStyles.inputSmall}
                    placeholder="0"
                    required
                  />
                </div>
                <div className={formStyles.field}>
                  <label className={formStyles.labelSmall}>SKU</label>
                  <input
                    type="text"
                    value={variant.sku}
                    onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                    className={formStyles.inputSmall}
                    placeholder="Optional"
                  />
                </div>
              </div>
              {product.variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  className={formStyles.removeButton}
                  title="Remove variant"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Images */}
        <div className={formStyles.section}>
          <div className={formStyles.sectionHeader}>
            <h2 className={formStyles.sectionTitle}>Images</h2>
            <button type="button" onClick={addImage} className={styles.secondaryButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Image
            </button>
          </div>

          {product.images.map((image, index) => (
            <div key={index} className={formStyles.imageRow}>
              <div className={formStyles.imagePreview}>
                {image.url ? (
                  <img src={image.url} alt={image.alt || 'Preview'} />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
              </div>
              <div className={formStyles.imageFields}>
                <input
                  type="url"
                  value={image.url}
                  onChange={(e) => updateImage(index, 'url', e.target.value)}
                  className={formStyles.input}
                  placeholder="Image URL (Cloudinary, etc.)"
                />
                <input
                  type="text"
                  value={image.alt}
                  onChange={(e) => updateImage(index, 'alt', e.target.value)}
                  className={formStyles.input}
                  placeholder="Alt text (optional)"
                />
              </div>
              {product.images.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className={formStyles.removeButton}
                  title="Remove image"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className={formStyles.actions}>
          <Link href="/admin/products" className={styles.secondaryButton}>
            Cancel
          </Link>
          <button type="submit" className={styles.primaryButton} disabled={saving}>
            {saving ? 'Saving...' : isNew ? 'Create Product' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
