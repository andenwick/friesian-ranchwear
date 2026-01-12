/**
 * Animation constants used across the site
 * Centralizes magic numbers for easier tweaking and consistency
 */

// Scroll-related thresholds
export const SCROLL = {
  // Hero parallax fade - opacity reaches 0 at this scroll value
  HERO_FADE_DISTANCE: 600,
  // Hero parallax scale - scale reaches minimum at this scroll value
  HERO_SCALE_DISTANCE: 3000,
  // Minimum scale for hero content during parallax
  HERO_MIN_SCALE: 0.9,
  // Hero parallax translate multiplier (scrollY * this value)
  HERO_TRANSLATE_MULTIPLIER: 0.4,
  // ScrollProgress fade-in distance
  PROGRESS_FADE_DISTANCE: 400,
  // Header visibility threshold
  HEADER_SHOW_THRESHOLD: 100,
  // Scroll-to offset from top (pixels)
  SCROLL_TO_OFFSET: 120,
};

// Duration presets (seconds)
export const DURATION = {
  SLOW: 1.8,
  MEDIUM: 1.5,
  NORMAL: 1.4,
  FAST: 1.2,
  FASTER: 1.0,
  // CTA activation effect
  CTA_HIGHLIGHT: 2000, // milliseconds
};

// Entrance animation presets
export const ENTRANCE = {
  // Large elements (headings, hero)
  LARGE: {
    y: 30,
    blur: 6,
    duration: DURATION.NORMAL,
  },
  // Medium elements (subheadings, cards)
  MEDIUM: {
    y: 25,
    blur: 6,
    duration: DURATION.FAST,
  },
  // Small elements (text, buttons)
  SMALL: {
    y: 20,
    blur: 4,
    duration: DURATION.FAST,
  },
  // Subtle elements (icons, badges)
  SUBTLE: {
    y: 15,
    blur: 4,
    duration: DURATION.FASTER,
  },
  // Card grid items
  CARD: {
    y: 40,
    blur: 4,
    duration: DURATION.FAST,
  },
};

// Stagger values for grouped animations
export const STAGGER = {
  CARDS: 1.2,
  ICONS: 0.2,
};

// ScrollTrigger defaults
export const SCROLL_TRIGGER = {
  START_EARLY: 'top 85%',
  START_DEFAULT: 'top 80%',
  START_LATE: 'top 75%',
  START_CARDS: 'top 70%',
};

// Helper to generate fromTo values
export const createEntrance = (preset) => ({
  from: {
    y: preset.y,
    opacity: 0,
    filter: `blur(${preset.blur}px)`,
  },
  to: {
    y: 0,
    opacity: 1,
    filter: 'blur(0px)',
    duration: preset.duration,
  },
});
