# Friesian Ranchwear

E-commerce site for a western/streetwear apparel brand. Full checkout flow with Stripe, admin dashboard for order and product management, and a product catalog backed by PostgreSQL.

## Features

- **Product catalog** -- filterable grid with color swatches, size selection, and image galleries
- **Checkout** -- Stripe Payment Element with inventory reservation, stock validation, tax calculation, and webhook-driven order fulfillment
- **Admin dashboard** -- order management, product CRUD with Cloudinary image uploads, email subscriber list, review moderation
- **Auth** -- NextAuth with credential-based signup/signin, admin role gating
- **Reviews** -- verified-purchaser reviews with half-star ratings and admin approval workflow
- **Order tracking** -- customers can track orders by email without an account
- **Email capture** -- newsletter signup form
- **Error monitoring** -- Sentry integration for both client and server

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js (App Router) |
| Language | JavaScript |
| Database | PostgreSQL, Prisma ORM |
| Payments | Stripe (Payment Intents + Webhooks + Tax) |
| Auth | NextAuth.js |
| Images | Cloudinary |
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
prisma/                    # Schema
public/                    # Static assets
```

## Setup

```bash
npm install
cp .env.example .env.local   # Fill in credentials (see .env.example for required vars)
npx prisma generate
npx prisma db push           # Push schema to database
npm run dev
```

## Deployment

Auto-deploys from `main` via Railway.

## License

Proprietary -- All rights reserved.
