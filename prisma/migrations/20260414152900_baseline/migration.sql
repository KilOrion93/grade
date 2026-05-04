-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ModerationStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'OWNER', 'MANAGER');

-- CreateEnum
CREATE TYPE "public"."VisibilityType" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."businesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subscriptionId" TEXT,
    "description" TEXT,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."qr_codes" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."review_criterion_scores" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "criterionName" TEXT NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "review_criterion_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."review_flags" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reviews" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "visitTokenId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "visibilityType" "public"."VisibilityType" NOT NULL DEFAULT 'PUBLIC',
    "moderationStatus" "public"."ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "trustScore" INTEGER NOT NULL DEFAULT 100,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."staff_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "maxBusinesses" INTEGER NOT NULL DEFAULT 1,
    "maxTokensPerMonth" INTEGER NOT NULL DEFAULT 50,
    "hasAiSummary" BOOLEAN NOT NULL DEFAULT false,
    "hasAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "hasPosIntegration" BOOLEAN NOT NULL DEFAULT false,
    "hasDedicatedApi" BOOLEAN NOT NULL DEFAULT false,
    "hasPrioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "features" JSONB,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'OWNER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."visit_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "public"."audit_logs"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "public"."audit_logs"("entity" ASC, "entityId" ASC);

-- CreateIndex
CREATE INDEX "businesses_slug_idx" ON "public"."businesses"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "businesses_slug_key" ON "public"."businesses"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "review_criterion_scores_reviewId_criterionName_key" ON "public"."review_criterion_scores"("reviewId" ASC, "criterionName" ASC);

-- CreateIndex
CREATE INDEX "reviews_businessId_idx" ON "public"."reviews"("businessId" ASC);

-- CreateIndex
CREATE INDEX "reviews_createdAt_idx" ON "public"."reviews"("createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_visitTokenId_key" ON "public"."reviews"("visitTokenId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "staff_memberships_userId_businessId_key" ON "public"."staff_memberships"("userId" ASC, "businessId" ASC);

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE INDEX "visit_tokens_businessId_idx" ON "public"."visit_tokens"("businessId" ASC);

-- CreateIndex
CREATE INDEX "visit_tokens_token_idx" ON "public"."visit_tokens"("token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "visit_tokens_token_key" ON "public"."visit_tokens"("token" ASC);

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."businesses" ADD CONSTRAINT "businesses_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."qr_codes" ADD CONSTRAINT "qr_codes_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_criterion_scores" ADD CONSTRAINT "review_criterion_scores_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "public"."reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_flags" ADD CONSTRAINT "review_flags_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "public"."reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_visitTokenId_fkey" FOREIGN KEY ("visitTokenId") REFERENCES "public"."visit_tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_memberships" ADD CONSTRAINT "staff_memberships_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_memberships" ADD CONSTRAINT "staff_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."visit_tokens" ADD CONSTRAINT "visit_tokens_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

