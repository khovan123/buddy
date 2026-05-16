-- CreateEnum
CREATE TYPE "MediaProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'AVAILABLE', 'FAILED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "media_files" (
    "id" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "status" "MediaProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "content_id" TEXT,
    "content_type" TEXT,
    "streaming_url" TEXT,
    "trailer_url" TEXT,
    "download_url" TEXT,
    "processing_error" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "preview_s3_key" TEXT,
    "preview_status" "MediaProcessingStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox" (
    "id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "exchange" TEXT NOT NULL,
    "routing_key" TEXT NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_files_status_idx" ON "media_files"("status");

-- CreateIndex
CREATE INDEX "media_files_uploaded_by_idx" ON "media_files"("uploaded_by");

-- CreateIndex
CREATE INDEX "media_files_content_id_idx" ON "media_files"("content_id");

-- CreateIndex
CREATE INDEX "media_files_preview_s3_key_idx" ON "media_files"("preview_s3_key");

-- CreateIndex
CREATE INDEX "media_files_bucket_s3_key_idx" ON "media_files"("bucket", "s3_key");

-- CreateIndex
CREATE INDEX "outbox_status_occurred_at_idx" ON "outbox"("status", "occurred_at");

-- CreateIndex
CREATE INDEX "outbox_correlation_id_idx" ON "outbox"("correlation_id");
