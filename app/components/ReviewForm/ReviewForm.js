'use client';

import { useState } from 'react';
import StarRating from '../StarRating/StarRating';
import styles from './ReviewForm.module.css';

export default function ReviewForm({ productId, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, title: title.trim(), body: body.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setRating(0);
        setTitle('');
        setBody('');
        if (onSubmit) onSubmit();
      } else {
        setError(data.error || 'Failed to submit review');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className={styles.success}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <p>Thank you for your review! It will be visible once approved.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h4 className={styles.formTitle}>Write a Review</h4>

      <div className={styles.field}>
        <label className={styles.label}>Your Rating *</label>
        <StarRating rating={rating} onChange={setRating} size="large" />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="review-title">Title (optional)</label>
        <input
          id="review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          className={styles.input}
          maxLength={100}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="review-body">Your Review</label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your thoughts about this product..."
          className={styles.textarea}
          rows={4}
          maxLength={1000}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button
        type="submit"
        disabled={submitting || rating === 0}
        className={styles.submitButton}
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
