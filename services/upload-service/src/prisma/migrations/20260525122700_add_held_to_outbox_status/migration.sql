-- AlterEnum: Add HELD value to OutboxStatus before PENDING
-- This ensures outbox rows can be inserted with status='HELD' for the
-- held-then-ready atomicity pattern used by confirm-resource and video processing.
-- Note: ADD VALUE ... BEFORE requires Postgres 12+.
ALTER TYPE "OutboxStatus" ADD VALUE IF NOT EXISTS 'HELD' BEFORE 'PENDING';
