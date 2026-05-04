-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "stripePriceId" TEXT;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "stripeCheckoutSessionId" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- Backfill existing rows before enforcing NOT NULL
UPDATE "subscriptions"
SET "updatedAt" = COALESCE("endDate", "startDate", CURRENT_TIMESTAMP)
WHERE "updatedAt" IS NULL;

-- Enforce NOT NULL after backfill
ALTER TABLE "subscriptions" ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "businesses_subscriptionId_key" ON "businesses"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_stripePriceId_key" ON "subscription_plans"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

