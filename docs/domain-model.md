# Domain model and invariants

Last verified: September 10, 2026

This document describes the deployed payment-integrity model. Production runs main
commit `d78bcd8422d4c0a1383c2563065fe7bd8e6feb7e`; its tree matches independently
reviewed candidate `1a8bdb4095082b7c0a1f6d52707afddd9113d40c`.

## Ownership

| Data | Source of truth | Notes |
| --- | --- | --- |
| Users, products, inventory, orders, reviews | PostgreSQL | Accessed through Prisma |
| Card and payment execution | Stripe | The application stores PaymentIntent IDs and projected order status |
| Product image assets | Cloudinary | Product records store delivery URLs; Drive URLs remain for legacy images |
| Mailing-list rows | Google Sheets | Not transactionally connected to application data |
| Cart | Browser `localStorage` | Untrusted display state; validated at checkout |
| Analytics consent | Browser `localStorage` | Controls Google Analytics only |

## Entity relationships

```mermaid
erDiagram
    USER ||--o{ ADDRESS : owns
    USER ||--o{ ORDER : places
    USER ||--o{ REVIEW : writes
    ADDRESS ||--o{ ORDER : referenced_by
    PRODUCT ||--|{ PRODUCT_VARIANT : has
    PRODUCT ||--o{ PRODUCT_IMAGE : has
    PRODUCT ||--o{ REVIEW : receives
    ORDER ||--|{ ORDER_ITEM : contains
    ORDER o|--o| CHECKOUT_ATTEMPT : created_by
    ORDER o|--o{ STRIPE_EVENT : projected_from
    ORDER ||--o{ FINANCIAL_OPERATION : requires
    ORDER ||--o{ ADMIN_ORDER_EVENT : audited_by
    PRODUCT_VARIANT ||--o{ ORDER_ITEM : purchased_as

    USER {
      string id PK
      string email UK
      string passwordHash
      boolean isAdmin
    }
    PRODUCT {
      string id PK
      decimal basePrice
      boolean active
      string features
    }
    PRODUCT_VARIANT {
      string id PK
      string sku UK
      int stock
      decimal price
    }
    ORDER {
      string id PK
      string stripePaymentId
      enum status
      enum paymentStatus
      int paymentAmountCents
      string paymentCurrency
      int amountRefundedCents
      string stripeTaxCalculationId
      string stripeTaxTransactionId
      decimal subtotal
      decimal shipping
      decimal tax
      decimal total
    }
    ORDER_ITEM {
      string id PK
      int quantity
      decimal unitPrice
      string productName
    }
    REVIEW {
      string id PK
      int rating
      boolean approved
    }
    CHECKOUT_ATTEMPT {
      string id PK
      string actorScopeHash
      string keyHash
      string payloadHash
      enum status
      string leaseToken
      datetime paymentCallStartedAt
    }
    STRIPE_EVENT {
      string id PK
      string type
      string objectId
      enum status
      int attempts
      datetime leaseExpiresAt
    }
    FINANCIAL_OPERATION {
      string id PK
      enum kind
      enum status
      string reference UK
      string requestHash
      string providerObjectId UK
    }
    ADMIN_ORDER_EVENT {
      string id PK
      string actorUserId
      enum fromStatus
      enum toStatus
      string reason
    }
```

## Product and inventory

A `Product` is the catalog identity. A `ProductVariant` is the purchasable stock unit.

Rules:

- Only active products are returned by the public catalog.
- A variant can override the product base price.
- SKU is unique when present.
- Product, size, and color are unique as a variant combination.
- Checkout requires a variant ID and validates current stock.
- Stock cannot go negative through checkout because the decrement uses `stock >= quantity` inside the order transaction.
- A product or variant referenced by an order is historical data and cannot be deleted through the admin API.
- Deactivation and stock zero are the supported retirement controls.

Known modeling gaps:

- Product features are JSON stored in a string column rather than a typed JSON field or relation.
- Category, size, and color are free-form strings.
- Stock adjustments have no ledger, reason, actor, or audit timestamp beyond the variant update time.
- Inventory adjustment outside checkout has no reason/actor ledger. Checkout reservation
  itself is linked to a durable `CheckoutAttempt`.

## Order totals

The server calculates every persisted amount:

```text
unit price = variant override or product base price
subtotal = sum(unit price * quantity)
shipping = 0 when subtotal >= 50 USD, otherwise 5.99 USD
tax = Stripe Tax result
total = subtotal + shipping + tax
```

Client totals are previews and never authorize a charge.

Amounts are stored as database decimals, but parts of the application calculate with JavaScript numbers before converting to cents for Stripe. A future commerce module should make integer cents the in-memory boundary.

## Payment and fulfillment state

```mermaid
stateDiagram-v2
    state PaymentProjection {
      [*] --> UNKNOWN: legacy backfill
      [*] --> PENDING: hardened checkout
      PENDING --> PAID: verified success webhook
      PENDING --> CANCELLED: confirmed cancellation
      PAID --> PARTIALLY_REFUNDED: cumulative refund below paid amount
      PARTIALLY_REFUNDED --> PARTIALLY_REFUNDED: additional partial refund
      PAID --> REFUNDED: full refund
      PARTIALLY_REFUNDED --> REFUNDED: cumulative full refund
    }

    state FulfillmentProjection {
      [*] --> ORDER_PENDING: checkout reservation
      ORDER_PENDING --> ORDER_PAID: verified payment
      ORDER_PENDING --> ORDER_CANCELLED: confirmed cancellation + one restock
      ORDER_PAID --> PROCESSING: authorized admin + reason
      PROCESSING --> SHIPPED: authorized admin + reason
      SHIPPED --> DELIVERED: authorized admin + reason
      ORDER_PAID --> ORDER_REFUNDED: full refund
      PROCESSING --> ORDER_REFUNDED: full refund
      SHIPPED --> ORDER_REFUNDED: full refund
      DELIVERED --> ORDER_REFUNDED: full refund
    }
```

The `ORDER_*` labels above are diagram aliases used to keep the two projections visually
distinct. Their persisted values are the `OrderStatus` enum names without that prefix.

The fulfillment graph is enforced in `lib/order-status.js`. Admins cannot create financial
states; verified payment is required before fulfillment, and actor/reason audit rows are
committed atomically with the transition.

The additive expand-phase model separates:

- payment projection: `UNKNOWN`, `PENDING`, `PAID`, `CANCELLED`,
  `PARTIALLY_REFUNDED`, and `REFUNDED`;
- fulfillment/order projection: `PENDING`, `PAID`, `PROCESSING`, `SHIPPED`,
  `DELIVERED`, `CANCELLED`, and `REFUNDED`;
- unresolved operational work: durable `RETRY`/`RECONCILE` states on Stripe events and
  financial operations, plus checkout-attempt reconciliation.

`CheckoutAttempt` has its own durable progression:

```mermaid
stateDiagram-v2
    [*] --> INITIALIZING: accepted key + payload
    INITIALIZING --> TAX_READY: Tax calculation persisted
    TAX_READY --> RESERVED: stock + order committed
    RESERVED --> READY: PaymentIntent linked
    INITIALIZING --> FAILED: safe local failure
    TAX_READY --> FAILED: safe pre-reservation failure
    RESERVED --> RECONCILE: provider result uncertain past replay window
```

Leases and fencing allow an expired worker to be replaced without allowing its late
completion to overwrite the new owner. Stripe events and financial operations follow
the same `received/pending -> processing -> processed/succeeded` pattern, with retry
and reconciliation states for unresolved work.

## Payment reconciliation

Each checkout creates one Stripe PaymentIntent and stores its ID on the order.

Current safeguards:

- Webhooks require a valid Stripe signature.
- Success updates only `PENDING` orders.
- A failed payment attempt leaves the order pending so the same PaymentIntent can be retried.
- Cancellation restores stock only for a `PENDING` order.
- Repeated cancellation events do not restore stock twice.
- Cleanup re-reads Stripe after a failed cancellation to avoid releasing inventory for a payment that won a race.

Persistence constraints and durable records now include unique PaymentIntent and Tax IDs,
`StripeEvent`, `FinancialOperation`, refund cents bounded by the expected payment amount,
and `CheckoutAttempt`. `npm run reconcile:report` exposes unresolved work; scheduling and
alert routing remain deployment operations work.

## Customer identity and addresses

Accounts are optional. Guest order contact and shipping information are snapshotted on `Order`. Signed-in orders also snapshot shipping information, which protects historical fulfillment data from later address edits.

`Address` exists in the schema but no current checkout or account flow creates or selects address records. `addressId` is effectively dormant.

Anonymous email-only history is disabled. Account history is scoped by immutable user ID.
Guests receive a random single-order capability whose hash is stored server-side and whose
raw value remains in the checkout browser for at most 30 days. It cannot authorize an
account order or another guest order.

## Reviews

- A user can review a product once.
- Review submission requires a paid or later order containing a variant of that product.
- Ratings are stored as integer half-star units from 1 through 10.
- New reviews are private until approved by an admin.
- Public review reads return only approved reviews.

There is no moderation audit trail, rejection reason, or record of the admin actor.

## Authentication

- Email is normalized to lowercase.
- Passwords are bcrypt-hashed with cost 12.
- Password minimum length is 8.
- JWT sessions carry user ID and admin status.
- Admin status is rechecked against PostgreSQL for existing admin tokens.

Input length limits, password maximum length, account verification, password reset, and session revocation are not implemented.

## Subscriber model

The mailing list is a Google Sheet containing email and timestamp rows. Emails are normalized before duplicate comparison. The read-then-append sequence is not atomic, so concurrent requests can still create duplicates.

If subscriber data becomes operationally important, move it into PostgreSQL with a unique email constraint and export or sync to the marketing provider asynchronously.
