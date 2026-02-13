# Friesian Ranchwear

E-commerce site for a western/streetwear apparel brand. Full checkout flow with Stripe, admin dashboard for order and product management, and a product catalog backed by Google Sheets for easy client updates.

## Features

- **Product catalog** — filterable grid with color swatches, size selection, and image galleries. Products sourced from Google Sheets with 1-hour cache and manual refresh
- **Checkout** — Stripe integration with inventory reservation, stock validation, and webhook-driven order fulfillment
- **Admin dashboard** — order management, product CRUD with Cloudinary image uploads, email subscriber list, review moderation
- **Auth** — NextAuth with credential-based signup/signin, admin role gating
- **Email capture** — newsletter signup synced to Google Sheets
- **Order tracking** — customers can track orders by email without an account
- **Error monitoring** — Sentry integration for both client and server
- **Analytics** — Google Analytics

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js (App Router) |
| Language | JavaScript |
| Database | PostgreSQL, Prisma ORM |
| Payments | Stripe (Checkout Sessions + Webhooks) |
| Auth | NextAuth.js |
| Images | Cloudinary |
| Product Source | Google Sheets API |
| Monitoring | Sentry |
| Hosting | Railway |

## Project Structure

```
app/
├── page.js                # Landing page (hero, brand story, product showcase)
├── products/              # Product catalog with filtering
├── checkout/              # Stripe checkout + success page
├── track-order/           # Order lookup by email
├── account/               # Customer account + order history
├── admin/                 # Admin dashboard (orders, products, emails, reviews)
├── auth/                  # Sign in / sign up
├── api/                   # API routes (checkout, webhooks, products, admin)
└── components/            # Shared UI components

components/                # Top-level reusable components
lib/                       # Database client, auth config, utilities
prisma/                    # Schema + migrations
public/                    # Static assets
scripts/                   # Google Sheets setup utilities
```

## Setup

```bash
npm install
cp .env.example .env.local  # Configure credentials
npx prisma migrate deploy
npm run dev
```

## Deployment

Auto-deploys from `main` via Railway.

## License

Proprietary — All rights reserved.
