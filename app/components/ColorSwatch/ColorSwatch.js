'use client';

import styles from './ColorSwatch.module.css';

// Map common color names to hex values
const COLOR_MAP = {
  'black': '#000000',
  'white': '#FFFFFF',
  'navy': '#1a237e',
  'brown': '#795548',
  'tan': '#d2b48c',
  'beige': '#f5f5dc',
  'gray': '#808080',
  'grey': '#808080',
  'red': '#c62828',
  'blue': '#1565c0',
  'green': '#2e7d32',
  'yellow': '#f9a825',
  'orange': '#ef6c00',
  'pink': '#ec407a',
  'purple': '#7b1fa2',
  'gold': '#C4A35A',
  'silver': '#c0c0c0',
  'cream': '#fffdd0',
  'charcoal': '#36454f',
  'olive': '#808000',
  'burgundy': '#800020',
  'rust': '#b7410e',
  'coral': '#ff7f50',
  'teal': '#008080',
  'khaki': '#c3b091',
};

function getColorHex(colorName) {
  if (!colorName) return '#808080';
  const normalized = colorName.toLowerCase().trim();
  return COLOR_MAP[normalized] || colorName; // Fallback to using name as CSS color
}

export default function ColorSwatch({
  colors,
  selectedColor,
  onSelect,
  availableColors = null // Colors that are in stock for current size
}) {
  if (!colors || colors.length === 0) return null;

  return (
    <div className={styles.container}>
      <span className={styles.label}>Color</span>
      <div className={styles.swatches}>
        {colors.map((color) => {
          const isSelected = selectedColor === color;
          const isAvailable = availableColors === null || availableColors.includes(color);
          const hexColor = getColorHex(color);

          return (
            <button
              key={color}
              type="button"
              className={`${styles.swatch} ${isSelected ? styles.selected : ''} ${!isAvailable ? styles.unavailable : ''}`}
              style={{ backgroundColor: hexColor }}
              onClick={() => isAvailable && onSelect(color)}
              disabled={!isAvailable}
              title={color}
              aria-label={`Select ${color} color`}
            >
              {isSelected && (
                <svg
                  className={styles.checkmark}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isLightColor(hexColor) ? '#000' : '#fff'}
                  strokeWidth="3"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      {selectedColor && (
        <span className={styles.selectedName}>{selectedColor}</span>
      )}
    </div>
  );
}

// Determine if a color is light (for checkmark contrast)
function isLightColor(hex) {
  if (!hex || !hex.startsWith('#')) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
