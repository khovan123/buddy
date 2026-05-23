ALTER TABLE "users" ALTER COLUMN "subscription_plan" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "subscription_plan" DROP NOT NULL;
