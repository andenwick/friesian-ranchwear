# Friesian Ranchwear Design System

Extracted 2026-03-01 from iron-horse-redesign branch.

## Spacing

Base: 4px. All spacing must use tokens or be a multiple of 4.

| Token | Value | Usage |
|-------|-------|-------|
| --space-xs | 4px | Tight gaps, small margins |
| --space-sm | 8px | Card padding, icon gaps |
| --space-md | 16px | Section padding, form gaps |
| --space-lg | 24px | Section margins |
| --space-xl | 40px | Large section spacing |
| --space-2xl | 64px | Page section gaps |
| --space-3xl | 96px | Hero spacing |
| --space-4xl | 128px | Page top padding |

Allowed exceptions:
- `2px` for tight inline gaps (star ratings, status text)
- `1px` for borders
- Page-level padding (120px, 100px, 60px, 40px) - not on the 4px grid but acceptable for page chrome
- `clamp()` values for fluid sizing

Off-grid violations (should not appear in new code):
- 10px (use 8px or 16px)
- 14px spacing (use 16px)
- 12px spacing (use 8px or 16px)
- 5px, 6px (use 4px or 8px)

## Typography

Fonts: Barlow Condensed (display), Barlow (body).

| Token | Value | Usage |
|-------|-------|-------|
| --font-size-hero | clamp(64px, 12vw, 160px) | Hero headlines |
| --font-size-4xl | clamp(36px, 6vw, 64px) | Page titles |
| --font-size-3xl | clamp(28px, 5vw, 48px) | Section titles |
| --font-size-2xl | clamp(24px, 4vw, 36px) | Sub-sections |
| --font-size-xl | clamp(20px, 3vw, 28px) | Card titles |
| --font-size-lg | 18px | Large body, nav items |
| --font-size-md | 16px | Body text |
| --font-size-base | 15px | Default body |
| --font-size-sm | 13px | Secondary text |
| --font-size-xs | 12px | Captions, metadata |

Off-scale values in use:
- 10px: badge counts (Header, ProductFilters) - below token scale, acceptable for badges
- 14px: Footer links - off-scale (should be --font-size-sm or --font-size-base)
- 11px, 9px: admin only

## Colors

### Core Palette

| Token | Value | Usage |
|-------|-------|-------|
| --color-black | #0C0C0C | Page background |
| --color-charcoal | #1A1816 | Elevated surfaces |
| --color-smoke | #2A2724 | Card backgrounds, borders |
| --color-stone | #A8998A | Muted text |
| --color-parchment | #F2EDE8 | Primary text |
| --color-brass | #8B7355 | Accent, CTAs |
| --color-brass-light | #A38D6D | Accent hover |
| --color-warm-white | #FAF8F5 | Highlights |
| --color-error | #C4523A | Error states |

### Missing Semantic Colors (raw hex in codebase)

These are used but have no token:
- Success green: #22c55e (4x across checkout, auth, product detail)
- Verified green: #10b981 (2x in ReviewCard, ReviewForm)
- Warning yellow: #eab308 (1x admin only)
- Pure white: #fff (8x for form/card backgrounds in light-bg pages)

## Border Radius

No tokens defined. Current usage:

| Value | Context |
|-------|---------|
| 50% | Circles (swatches, badges, avatars) |
| 2px | Drawer handle (ProductFilters) |
| 0 | Cards, buttons (public site uses sharp corners) |

Admin uses: 4px, 6px, 8px, 12px, 16px, 28px (no consistency required for admin).

Public site principle: **sharp corners everywhere** except circles.

## Depth

Strategy: **borders-only** on public site.

- Primary border: `1px solid rgba(139, 115, 85, 0.1-0.4)` (brass at varying opacity)
- Only exception: ProductCard hover gets `--shadow-md`
- Admin uses shadows freely (not constrained)

Shadow tokens exist (--shadow-xs through --shadow-xl) but are reserved, not default.

## z-index Scale

| Value | Usage |
|-------|-------|
| 1-2 | Local stacking (within a component) |
| 10 | Auth overlays |
| 40-50 | Admin overlays, dropdowns |
| 1000 | Header |
| 9998 | Filter backdrop |
| 9999 | Filter drawer |

No tokens defined. Values are functional but not formalized.

## Touch Targets

Minimum interactive size: 44x44px (WCAG 2.5.8).

Known compliant: menu button (44px), size pills (44px).
Watch for: small icon buttons, close buttons.

## Component Patterns

### ProductCard
- Sharp corners (no border-radius)
- Image fills full width
- Info padding: --space-sm (8px) on iron-horse branch
- Name: --font-display, uppercase, --tracking-wide
- Price: --font-body, --color-brass
- Hover: --shadow-md

### Header
- Fixed position, z-index 1000
- Transparent when at top, frosted glass on scroll
- Scroll state: rgba(12,12,12, 0.3-0.5) + backdrop-filter blur(8-10px)
- Brand gap: --space-sm (8px)

### ProductFilters
- Mobile: full-screen drawer (z-index 9999) with backdrop (9998)
- Desktop: horizontal dropdown bar
- Filter count badge: 10px font, brass background

## Transitions

| Token | Value | Usage |
|-------|-------|-------|
| --transition-fast | 0.12s ease | Hover, focus |
| --transition-base | 0.25s ease | Default |
| --transition-slow | 0.4s ease | Drawer, overlay |
| --transition-smooth | 0.25s cubic-bezier(0.4,0,0.2,1) | Smooth motion |
