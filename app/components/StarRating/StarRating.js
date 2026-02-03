'use client';

import { useState } from 'react';
import styles from './StarRating.module.css';

export default function StarRating({
  rating = 0,
  onChange,
  readonly = false,
  size = 'medium', // 'small', 'medium', 'large'
}) {
  const [hoverRating, setHoverRating] = useState(0);

  const displayRating = hoverRating || rating;

  const handleClick = (starIndex, isHalf) => {
    if (readonly || !onChange) return;
    const newRating = isHalf ? starIndex + 0.5 : starIndex + 1;
    onChange(newRating);
  };

  const handleMouseMove = (e, starIndex) => {
    if (readonly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    setHoverRating(isHalf ? starIndex + 0.5 : starIndex + 1);
  };

  const handleMouseLeave = () => {
    if (readonly) return;
    setHoverRating(0);
  };

  const renderStar = (index) => {
    const filled = displayRating >= index + 1;
    const halfFilled = !filled && displayRating >= index + 0.5;

    return (
      <span
        key={index}
        className={`${styles.star} ${styles[size]} ${readonly ? styles.readonly : styles.interactive}`}
        onMouseMove={(e) => handleMouseMove(e, index)}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const isHalf = x < rect.width / 2;
          handleClick(index, isHalf);
        }}
      >
        {/* Empty star background */}
        <svg
          className={styles.starEmpty}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>

        {/* Filled star (full or half) */}
        {(filled || halfFilled) && (
          <svg
            className={`${styles.starFilled} ${halfFilled ? styles.half : ''}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )}
      </span>
    );
  };

  return (
    <div className={styles.container} role={readonly ? 'img' : 'slider'} aria-label={`Rating: ${rating} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map(renderStar)}
    </div>
  );
}
