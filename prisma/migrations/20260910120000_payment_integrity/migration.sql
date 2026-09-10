-- Additive payment integrity and durable-operation migration.
-- Rehearse against a restored disposable database before production approval.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Order"
    WHERE "stripePaymentId" IS NOT NULL
    GROUP BY "stripePaymentId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate Order.stripePaymentId values must be reconciled before migration';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "ProductVariant"
    GROUP BY "productId", "size", "color"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate product variant option tuples must be reconciled before migration';
  END IF;

  IF EXISTS (SELECT 1 FROM "Product" WHERE "basePrice" < 0)
    OR EXISTS (SELECT 1 FROM "ProductVariant" WHERE "price" < 0 OR "stock" < 0)
    OR EXISTS (SELECT 1 FROM "ProductImage" WHERE "position" < 0)
    OR EXISTS (
      SELECT 1 FROM "Order"
      WHERE "subtotal" < 0 OR "shipping" < 0 OR "tax" < 0 OR "total" < 0
        OR "total" <> "subtotal" + "shipping" + "tax"
        OR ROUND("total" * 100) > 2147483647
    )
    OR EXISTS (SELECT 1 FROM "OrderItem" WHERE "quantity" <= 0 OR "unitPrice" < 0)
    OR EXISTS (SELECT 1 FROM "Review" WHERE "rating" NOT BETWEEN 1 AND 10)
  THEN
    RAISE EXCEPTION 'invalid legacy values must be reconciled before integrity constraints are installed';
  END IF;
END $$;

CREATE TYPE "PaymentStatus" AS ENUM ('UNKNOWN', 'PENDING', 'PAID', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED');
CREATE TYPE "CheckoutAttemptStatus" AS ENUM ('INITIALIZING', 'TAX_READY', 'RESERVED', 'READY', 'FAILED', 'RECONCILE');
CREATE TYPE "StripeEventStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'RETRY', 'RECONCILE');
CREATE TYPE "FinancialOperationKind" AS ENUM ('COMMIT_TAX', 'REVERSE_TAX_FULL', 'REVERSE_TAX_PARTIAL');
CREATE TYPE "FinancialOperationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'RETRY', 'RECONCILE');

ALTER TABLE "Order"
  ADD COLUMN "paymentStatus" "PaymentStatus",
  ADD COLUMN "paymentAmountCents" INTEGER,
  ADD COLUMN "paymentCurrency" VARCHAR(3) NOT NULL DEFAULT 'usd',
  ADD COLUMN "amountRefundedCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "stripeTaxCalculationId" TEXT,
  ADD COLUMN "stripeTaxTransactionId" TEXT;

UPDATE "Order"
SET
  -- Legacy status labels were mutable by admins and are not provider evidence.
  "paymentStatus" = 'UNKNOWN'::"PaymentStatus",
  "paymentAmountCents" = ROUND("total" * 100)::INTEGER,
  "amountRefundedCents" = 0;

ALTER TABLE "Order"
  ALTER COLUMN "paymentStatus" SET NOT NULL,
  ALTER COLUMN "paymentStatus" SET DEFAULT 'UNKNOWN';

DROP INDEX "ProductVariant_productId_size_color_key";
CREATE UNIQUE INDEX "ProductVariant_productId_size_color_key"
  ON "ProductVariant"("productId", "size", "color") NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "Order_stripePaymentId_key" ON "Order"("stripePaymentId");
CREATE UNIQUE INDEX "Order_stripeTaxCalculationId_key" ON "Order"("stripeTaxCalculationId");
CREATE UNIQUE INDEX "Order_stripeTaxTransactionId_key" ON "Order"("stripeTaxTransactionId");
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

CREATE TABLE "CheckoutAttempt" (
  "id" TEXT NOT NULL,
  "actorScopeHash" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "checkoutData" JSONB NOT NULL,
  "status" "CheckoutAttemptStatus" NOT NULL DEFAULT 'INITIALIZING',
  "orderId" TEXT,
  "paymentIntentId" TEXT,
  "taxCalculationId" TEXT,
  "amountCents" INTEGER,
  "currency" VARCHAR(3),
  "paymentCallStartedAt" TIMESTAMP(3),
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CheckoutAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StripeEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "objectId" TEXT,
  "orderId" TEXT,
  "status" "StripeEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "leaseExpiresAt" TIMESTAMP(3),
  "lastError" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialOperation" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "kind" "FinancialOperationKind" NOT NULL,
  "status" "FinancialOperationStatus" NOT NULL DEFAULT 'PENDING',
  "reference" TEXT NOT NULL,
  "requestData" JSONB NOT NULL,
  "requestHash" TEXT NOT NULL,
  "providerObjectId" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "lastAttemptAt" TIMESTAMP(3),
  "externalCallStartedAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialOperation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminOrderEvent" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "fromStatus" "OrderStatus" NOT NULL,
  "toStatus" "OrderStatus" NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminOrderEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CheckoutAttempt_orderId_key" ON "CheckoutAttempt"("orderId");
CREATE UNIQUE INDEX "CheckoutAttempt_paymentIntentId_key" ON "CheckoutAttempt"("paymentIntentId");
CREATE UNIQUE INDEX "CheckoutAttempt_actorScopeHash_keyHash_key" ON "CheckoutAttempt"("actorScopeHash", "keyHash");
CREATE INDEX "CheckoutAttempt_status_leaseExpiresAt_idx" ON "CheckoutAttempt"("status", "leaseExpiresAt");
CREATE INDEX "StripeEvent_status_leaseExpiresAt_idx" ON "StripeEvent"("status", "leaseExpiresAt");
CREATE INDEX "StripeEvent_objectId_idx" ON "StripeEvent"("objectId");
CREATE INDEX "StripeEvent_orderId_idx" ON "StripeEvent"("orderId");
CREATE UNIQUE INDEX "FinancialOperation_reference_key" ON "FinancialOperation"("reference");
CREATE UNIQUE INDEX "FinancialOperation_providerObjectId_key" ON "FinancialOperation"("providerObjectId");
CREATE INDEX "FinancialOperation_status_nextAttemptAt_leaseExpiresAt_idx" ON "FinancialOperation"("status", "nextAttemptAt", "leaseExpiresAt");
CREATE INDEX "FinancialOperation_orderId_idx" ON "FinancialOperation"("orderId");
CREATE INDEX "AdminOrderEvent_orderId_createdAt_idx" ON "AdminOrderEvent"("orderId", "createdAt");
CREATE INDEX "AdminOrderEvent_actorUserId_createdAt_idx" ON "AdminOrderEvent"("actorUserId", "createdAt");

ALTER TABLE "CheckoutAttempt" ADD CONSTRAINT "CheckoutAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StripeEvent" ADD CONSTRAINT "StripeEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialOperation" ADD CONSTRAINT "FinancialOperation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminOrderEvent" ADD CONSTRAINT "AdminOrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminOrderEvent" ADD CONSTRAINT "AdminOrderEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_basePrice_nonnegative" CHECK ("basePrice" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_price_nonnegative" CHECK ("price" IS NULL OR "price" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_stock_nonnegative" CHECK ("stock" >= 0);
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_position_nonnegative" CHECK ("position" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_amounts_nonnegative" CHECK ("subtotal" >= 0 AND "shipping" >= 0 AND "tax" >= 0 AND "total" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_matches_components" CHECK ("total" = "subtotal" + "shipping" + "tax");
ALTER TABLE "Order" ADD CONSTRAINT "Order_payment_amount_nonnegative" CHECK ("paymentAmountCents" IS NULL OR "paymentAmountCents" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_refund_amount_bounded" CHECK ("amountRefundedCents" >= 0 AND ("paymentAmountCents" IS NULL OR "amountRefundedCents" <= "paymentAmountCents"));
ALTER TABLE "Order" ADD CONSTRAINT "Order_payment_currency_lowercase" CHECK ("paymentCurrency" = LOWER("paymentCurrency") AND LENGTH("paymentCurrency") = 3);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_unitPrice_nonnegative" CHECK ("unitPrice" >= 0);
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_range" CHECK ("rating" BETWEEN 1 AND 10);
ALTER TABLE "CheckoutAttempt" ADD CONSTRAINT "CheckoutAttempt_amount_nonnegative" CHECK ("amountCents" IS NULL OR "amountCents" >= 0);
ALTER TABLE "StripeEvent" ADD CONSTRAINT "StripeEvent_attempts_nonnegative" CHECK ("attempts" >= 0);
ALTER TABLE "FinancialOperation" ADD CONSTRAINT "FinancialOperation_attempts_nonnegative" CHECK ("attempts" >= 0);
ALTER TABLE "AdminOrderEvent" ADD CONSTRAINT "AdminOrderEvent_reason_length" CHECK (LENGTH(BTRIM("reason")) BETWEEN 3 AND 500);

COMMIT;
