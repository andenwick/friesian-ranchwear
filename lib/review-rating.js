const REVIEW_RATING_MULTIPLIER = 2;

export function isValidReviewRating(rating) {
  return Number.isFinite(rating)
    && rating >= 0.5
    && rating <= 5
    && Number.isInteger(rating * REVIEW_RATING_MULTIPLIER);
}

export function encodeReviewRating(rating) {
  return Math.round(rating * REVIEW_RATING_MULTIPLIER);
}

export function decodeReviewRating(storedRating) {
  return Number(storedRating) / REVIEW_RATING_MULTIPLIER;
}
