'use client';

import { useEffect, useState } from 'react';
import styles from '../admin.module.css';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'all', label: 'All Reviews' },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [expandedReview, setExpandedReview] = useState(null);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  async function fetchReviews() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateReviewStatus(reviewId, approved) {
    setUpdating(reviewId);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });

      if (res.ok) {
        // Refresh list
        fetchReviews();
      } else {
        alert('Failed to update review');
      }
    } catch (err) {
      alert('Failed to update review');
    } finally {
      setUpdating(null);
    }
  }

  async function deleteReview(reviewId) {
    if (!confirm('Are you sure you want to delete this review?')) return;

    setUpdating(reviewId);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchReviews();
      } else {
        alert('Failed to delete review');
      }
    } catch (err) {
      alert('Failed to delete review');
    } finally {
      setUpdating(null);
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<span key={i} className={styles.starFilled}>★</span>);
      } else if (i === fullStars && hasHalf) {
        stars.push(<span key={i} className={styles.starFilled}>★</span>);
      } else {
        stars.push(<span key={i} className={styles.starEmpty}>★</span>);
      }
    }
    return stars;
  };

  if (loading) {
    return (
      <div className={`${styles.loadingContainer} ${styles.loadingInline}`}>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>REVIEWS</h1>
          <p className={styles.pageSubtitle}>{reviews.length} reviews</p>
        </div>
        <div className={styles.filterRow}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {reviews.length > 0 ? (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Rating</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <>
                  <tr
                    key={review.id}
                    onClick={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
                    className={styles.clickableRow}
                  >
                    <td>
                      <span className={styles.textBold}>{review.productName}</span>
                    </td>
                    <td>
                      <span>{renderStars(review.rating)}</span>
                      <span className={`${styles.textXs} ${styles.textMuted}`} style={{ marginLeft: '8px' }}>
                        ({review.rating})
                      </span>
                    </td>
                    <td>{review.userName}</td>
                    <td className={`${styles.textXs} ${styles.textMuted}`}>
                      {formatDate(review.createdAt)}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${review.approved ? styles.badgeActive : styles.badgeDraft}`}>
                        {review.approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className={styles.inlineFlexSm}>
                        {!review.approved && (
                          <button
                            className={`${styles.actionButton} ${styles.actionApprove}`}
                            onClick={() => updateReviewStatus(review.id, true)}
                            disabled={updating === review.id}
                            title="Approve"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          </button>
                        )}
                        {review.approved && (
                          <button
                            className={`${styles.actionButton} ${styles.actionWarning}`}
                            onClick={() => updateReviewStatus(review.id, false)}
                            disabled={updating === review.id}
                            title="Unapprove"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                        <button
                          className={`${styles.actionButton} ${styles.actionDanger}`}
                          onClick={() => deleteReview(review.id)}
                          disabled={updating === review.id}
                          title="Delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedReview === review.id && (
                    <tr key={`${review.id}-expanded`}>
                      <td colSpan="6" className={styles.expandedRow}>
                        {review.title && (
                          <p className={styles.textBold}>"{review.title}"</p>
                        )}
                        <p className={styles.textMuted} style={{ lineHeight: 1.6 }}>
                          {review.body || 'No review text provided.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <h3 className={styles.emptyTitle}>No reviews found</h3>
            <p className={styles.emptyText}>
              {statusFilter === 'pending'
                ? 'No reviews pending approval'
                : 'Reviews will appear here once customers submit them'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
