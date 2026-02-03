import StarRating from '../StarRating/StarRating';
import styles from './ReviewCard.module.css';

export default function ReviewCard({ review }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <StarRating rating={review.rating} readonly size="small" />
        {review.verified && (
          <span className={styles.verified}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            Verified Purchase
          </span>
        )}
      </div>

      {review.title && (
        <h4 className={styles.title}>"{review.title}"</h4>
      )}

      {review.body && (
        <p className={styles.body}>{review.body}</p>
      )}

      <div className={styles.footer}>
        <span className={styles.author}>{review.authorName}</span>
        <span className={styles.date}>{formatDate(review.createdAt)}</span>
      </div>
    </div>
  );
}
