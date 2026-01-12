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
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Predefined categories for western ranchwear
  const CATEGORIES = ['Hats', 'Shirts', 'Jeans', 'Boots', 'Accessories', 'Outerwear'];

  const [product, setProduct] = useState({
    name: '',
    description: '',
    basePrice: '',
    category: '',
    features: [''],
    active: true,
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
        // Parse features from JSON string
        let parsedFeatures = [''];
        if (data.features) {
          try {
            const parsed = JSON.parse(data.features);
            parsedFeatures = parsed.length > 0 ? parsed : [''];
          } catch {
            parsedFeatures = [''];
          }
        }
        setProduct({
          name: data.name || '',
          description: data.description || '',
          basePrice: data.basePrice?.toString() || '',
          category: data.category || '',
          features: parsedFeatures,
          active: data.active !== false,
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
        category: product.category,
        features: product.features.filter(f => f.trim()),
        active: product.active,
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

  // Feature helpers
  const addFeature = () => {
    setProduct({ ...product, features: [...product.features, ''] });
  };

  const removeFeature = (index) => {
    setProduct({
      ...product,
      features: product.features.filter((_, i) => i !== index),
    });
  };

  const updateFeature = (index, value) => {
    const newFeatures = [...product.features];
    newFeatures[index] = value;
    setProduct({ ...product, features: newFeatures });
  };

  // Image upload handlers
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload only image files');
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be less than 10MB');
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          // Add the uploaded image
          setProduct(prev => ({
            ...prev,
            images: [
              ...prev.images.filter(img => img.url), // Remove empty slots
              { url: data.url, alt: product.name || 'Product image', publicId: data.publicId },
            ],
          }));
        } else {
          const data = await res.json();
          setError(data.error || 'Failed to upload image');
        }
      } catch (err) {
        console.error('Upload error:', err);
        setError('Failed to upload image');
      }
    }

    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFileUpload(files);
    e.target.value = ''; // Reset input
  };

  const deleteImage = async (index) => {
    const image = product.images[index];

    // If it has a publicId, delete from Cloudinary
    if (image.publicId) {
      try {
        await fetch('/api/admin/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: image.publicId }),
        });
      } catch (err) {
        console.error('Failed to delete from Cloudinary:', err);
      }
    }

    // Remove from state
    setProduct({
      ...product,
      images: product.images.filter((_, i) => i !== index),
    });
  };

  const moveImage = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= product.images.length) return;
    const newImages = [...product.images];
    const [moved] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, moved);
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

          <div className={formStyles.grid}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Category</label>
              <select
                value={product.category}
                onChange={(e) => setProduct({ ...product, category: e.target.value })}
                className={formStyles.select}
              >
                <option value="">Select a category...</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Status</label>
              <div className={formStyles.toggleContainer}>
                <label className={formStyles.toggle}>
                  <input
                    type="checkbox"
                    checked={product.active}
                    onChange={(e) => setProduct({ ...product, active: e.target.checked })}
                  />
                  <span className={formStyles.toggleSlider}></span>
                </label>
                <span className={formStyles.toggleLabel}>
                  {product.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Features / Bullet Points */}
        <div className={formStyles.section}>
          <div className={formStyles.sectionHeader}>
            <h2 className={formStyles.sectionTitle}>Features & Highlights</h2>
            <button type="button" onClick={addFeature} className={styles.secondaryButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Feature
            </button>
          </div>
          <p className={formStyles.sectionHint}>Add bullet points that highlight key product features</p>

          {product.features.map((feature, index) => (
            <div key={index} className={formStyles.featureRow}>
              <span className={formStyles.bulletIcon}>•</span>
              <input
                type="text"
                value={feature}
                onChange={(e) => updateFeature(index, e.target.value)}
                className={formStyles.input}
                placeholder="e.g., 100% Premium Cotton"
              />
              <button
                type="button"
                onClick={() => removeFeature(index)}
                className={formStyles.removeButton}
                title="Remove feature"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
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
                <div className={formStyles.variantField}>
                  <label className={formStyles.labelSmall}>Size</label>
                  <input
                    type="text"
                    value={variant.size}
                    onChange={(e) => updateVariant(index, 'size', e.target.value)}
                    className={formStyles.inputSmall}
                    placeholder="S, M, L, XL..."
                  />
                </div>
                <div className={formStyles.variantField}>
                  <label className={formStyles.labelSmall}>Color</label>
                  <input
                    type="text"
                    value={variant.color}
                    onChange={(e) => updateVariant(index, 'color', e.target.value)}
                    className={formStyles.inputSmall}
                    placeholder="Black, Brown..."
                  />
                </div>
                <div className={formStyles.variantField}>
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
                <div className={formStyles.variantField}>
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
                <div className={formStyles.variantField}>
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
            </div>
          ))}
        </div>

        {/* Images */}
        <div className={formStyles.section}>
          <h2 className={formStyles.sectionTitle}>Images</h2>

          {/* Upload Drop Zone */}
          <div
            className={`${formStyles.dropZone} ${dragOver ? formStyles.dropZoneActive : ''} ${uploading ? formStyles.dropZoneUploading : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !uploading && document.getElementById('image-upload').click()}
          >
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            {uploading ? (
              <>
                <div className={formStyles.uploadSpinner} />
                <span className={formStyles.dropZoneText}>Uploading...</span>
              </>
            ) : (
              <>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className={formStyles.dropZoneText}>
                  Drag & drop images here or click to browse
                </span>
                <span className={formStyles.dropZoneHint}>
                  PNG, JPG up to 10MB
                </span>
              </>
            )}
          </div>

          {/* Image Grid */}
          {product.images.filter(img => img.url).length > 0 && (
            <div className={formStyles.imageGrid}>
              {product.images.filter(img => img.url).map((image, index) => (
                <div key={index} className={formStyles.imageCard}>
                  <div className={formStyles.imageCardPreview}>
                    <img src={image.url} alt={image.alt || 'Preview'} />
                    {index === 0 && (
                      <span className={formStyles.primaryBadge}>Primary</span>
                    )}
                  </div>
                  <div className={formStyles.imageCardActions}>
                    <button
                      type="button"
                      onClick={() => moveImage(index, index - 1)}
                      className={formStyles.imageCardButton}
                      disabled={index === 0}
                      title="Move left"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(index, index + 1)}
                      className={formStyles.imageCardButton}
                      disabled={index === product.images.filter(img => img.url).length - 1}
                      title="Move right"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteImage(index)}
                      className={`${formStyles.imageCardButton} ${formStyles.imageCardDelete}`}
                      title="Delete image"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
