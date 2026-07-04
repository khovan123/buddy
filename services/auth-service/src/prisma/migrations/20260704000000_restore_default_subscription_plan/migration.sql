UPDATE "users"
SET "subscription_plan" = 'STUDENT_FREE'
WHERE "subscription_plan" IS NULL;

ALTER TABLE "users"
ALTER COLUMN "subscription_plan" SET DEFAULT 'STUDENT_FREE';
