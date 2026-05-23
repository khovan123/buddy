-- CreateEnum
CREATE TYPE "SubscriptionAudience" AS ENUM ('CREATOR', 'STUDENT');

-- CreateTable
CREATE TABLE "subscription_plan_catalog" (
    "id" TEXT NOT NULL,
    "code" "SubscriptionPlan" NOT NULL,
    "audience" "SubscriptionAudience" NOT NULL,
    "tier" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "group_description" TEXT NOT NULL,
    "icon_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "badge" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "monthly_price_cents" INTEGER NOT NULL DEFAULT 0,
    "yearly_monthly_price_cents" INTEGER,
    "storage_bytes" BIGINT NOT NULL DEFAULT 0,
    "max_resources" INTEGER NOT NULL DEFAULT 0,
    "max_tutorials" INTEGER NOT NULL DEFAULT 0,
    "max_collections" INTEGER NOT NULL DEFAULT 0,
    "can_create_content" BOOLEAN NOT NULL DEFAULT false,
    "max_search_results" INTEGER NOT NULL DEFAULT 0,
    "feature_values" JSONB,
    "pbac" JSONB,
    "metadata" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plan_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_catalog_code_key" ON "subscription_plan_catalog"("code");

-- CreateIndex
CREATE INDEX "subscription_plan_catalog_audience_active_display_order_idx" ON "subscription_plan_catalog"("audience", "active", "display_order");

