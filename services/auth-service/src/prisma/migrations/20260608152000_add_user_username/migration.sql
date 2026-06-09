ALTER TABLE "users" ADD COLUMN "username" TEXT;

WITH ranked AS (
  SELECT
    id,
    COALESCE(
      NULLIF(regexp_replace(split_part(lower(email), '@', 1), '[^a-z0-9]+', '', 'g'), ''),
      'user'
    ) AS base,
    row_number() OVER (
      PARTITION BY COALESCE(
        NULLIF(regexp_replace(split_part(lower(email), '@', 1), '[^a-z0-9]+', '', 'g'), ''),
        'user'
      )
      ORDER BY created_at, id
    ) AS rn
  FROM "users"
)
UPDATE "users"
SET "username" = CASE
  WHEN ranked.rn = 1 THEN ranked.base
  ELSE ranked.base || ranked.rn::text
END
FROM ranked
WHERE "users"."id" = ranked.id;

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
