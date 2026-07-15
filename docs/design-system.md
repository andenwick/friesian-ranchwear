# Design system

**Status:** current implementation guide

**Last verified:** July 15, 2026

## Direction

The public brand system is a restrained western and streetwear visual language internally called Iron Horse. It uses dark neutral surfaces, parchment text, muted brass accents, condensed display type, sharp geometry, and limited motion.

The admin interface shares the palette but is an operational surface. It can use denser layout, status colors, and more depth than the storefront.

## Sources of truth

- Tokens and global behavior: `app/globals.css`
- Component implementation: colocated CSS modules
- This document: design intent and contribution rules

The older `.interface-design/system.md` path points here for compatibility. Do not maintain two token specifications.

## Core tokens

### Color

| Token | Value | Use |
| --- | --- | --- |
| `--color-black` | `#0C0C0C` | Page background |
| `--color-charcoal` | `#1A1816` | Elevated dark surface |
| `--color-smoke` | `#2A2724` | Dark cards and borders |
| `--color-stone` | `#A8998A` | Muted text |
| `--color-parchment` | `#F2EDE8` | Primary dark-surface text |
| `--color-brass` | `#8B7355` | Primary accent |
| `--color-brass-light` | `#A38D6D` | Accent hover |
| `--color-warm-white` | `#FAF8F5` | Light surface and highlight |
| semantic status tokens | see `app/globals.css` | Success, warning, danger, info, purple, muted |

Legacy aliases still map older token names to this palette. New code should use the current semantic or core names.

Opacity variants currently use `rgba()` directly in component CSS. That is acceptable when the base color and role are obvious. New standalone colors should become tokens.

### Typography

- Display: Barlow Condensed
- Body: Barlow
- Display sizes use fluid `clamp()` tokens.
- Body sizes range from 12 to 18 px through global tokens.
- Public product and section labels generally use uppercase and wide tracking.

### Spacing

The base grid is 4 px.

| Token | Value |
| --- | --- |
| `--space-xs` | 4 px |
| `--space-sm` | 8 px |
| `--space-md` | 16 px |
| `--space-lg` | 24 px |
| `--space-xl` | 40 px |
| `--space-2xl` | 64 px |
| `--space-3xl` | 96 px |
| `--space-4xl` | 128 px |

Prefer tokens. Use one-off spacing only when a component has a documented optical need.

### Shape and depth

- Public cards and buttons use sharp corners.
- Circles are reserved for swatches, badges, and round icon controls.
- Public depth is mostly borders and restrained hover shadow.
- The admin can use modest radius, gradients, and shadow for hierarchy.

### Motion

Global transition tokens range from 120 to 400 ms. GSAP is used for selected entry and scroll effects. Every new motion path must remain usable under `prefers-reduced-motion`, which is handled globally for CSS animation and transition duration.

## Component rules

### Header

- Fixed above public content.
- Transparent at the top where appropriate, dark and blurred after scroll.
- Interactive icons need visible labels and 44 px targets.

### Product cards

- Image-first layout.
- Category is secondary metadata.
- Name uses condensed display type.
- Price uses the brass accent.
- The whole card is the product-detail link.

### Product selection

- Disabled variant choices must be visually and programmatically unavailable.
- Size and color selection must expose an error before add-to-cart when required.
- Stock truth is server-side even when the client disables a choice.

### Cart and checkout

- Cart stays dark and brand-aligned.
- Checkout uses a light surface for form clarity and Stripe Element compatibility.
- Totals must distinguish preview amounts from server-confirmed amounts.
- Error and processing states need text, not color alone.

### Admin

- Optimize for scanning, safe writes, and clear status.
- Destructive actions require clear context.
- Financial labels must not imply a Stripe action occurred.
- Do not trade operational clarity for storefront styling consistency.

## Accessibility baseline

Present controls:

- global visible focus outline;
- reduced-motion override;
- semantic headings and buttons in the main flows;
- labels or accessible names on cart and social controls;
- responsive overflow checks.

Missing controls:

- no automated accessibility audit;
- no documented contrast verification;
- no screen-reader journey test;
- touch-target compliance is not enforced;
- modal focus trapping and restoration are not covered by tests.

## Current design debt

- The component split between `app/components` and `components` is not intuitive.
- `app/admin/products/[id]/form.module.css` is more than 700 lines.
- `app/admin/admin.module.css` is nearly 600 lines and serves unrelated screens.
- Several admin pages and consent UI use inline styles.
- Light-surface pages use raw `#fff` instead of a named surface token.
- Status greens remain hard-coded in a few modules despite semantic tokens existing.
- There is no isolated component catalog or visual regression suite.
- The old design document had become stale and still described semantic colors as missing after they were added.

## Contribution checklist

- Use existing typography, color, spacing, and transition tokens.
- Add a token before introducing a reusable new value.
- Keep public corners sharp unless the element is circular by function.
- Provide hover, focus, disabled, loading, empty, success, and error states as applicable.
- Check 375 px, 768 px, and 1280 px widths.
- Check keyboard focus and reduced motion.
- Do not add large page-level inline style objects.
- Update this document when the visual rules change.
