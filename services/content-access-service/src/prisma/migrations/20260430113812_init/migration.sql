-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('RESOURCE', 'COLLECTION', 'TUTORIAL');

-- CreateTable
CREATE TABLE "user_resource_access" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "resource_type" "ResourceType" NOT NULL,
    "purchase_id" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_resource_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_resource_access_user_id_resource_type_idx" ON "user_resource_access"("user_id", "resource_type");

-- CreateIndex
CREATE INDEX "user_resource_access_user_id_deleted_at_idx" ON "user_resource_access"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "user_resource_access_purchase_id_idx" ON "user_resource_access"("purchase_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_resource_access_user_id_resource_id_key" ON "user_resource_access"("user_id", "resource_id");
