UPDATE "subscription_plan_catalog"
SET
  "monthly_price_cents" = CASE
    WHEN "monthly_price_cents" IN (999, 9900000) THEN 99000
    ELSE "monthly_price_cents"
  END,
  "yearly_monthly_price_cents" = CASE
    WHEN "yearly_monthly_price_cents" IN (799, 7900000) THEN 79000
    ELSE "yearly_monthly_price_cents"
  END,
  "currency" = 'VND',
  "updated_at" = NOW()
WHERE "code" = 'CREATOR_PRO';

UPDATE "subscription_plan_catalog"
SET
  "monthly_price_cents" = CASE
    WHEN "monthly_price_cents" IN (499, 4900000) THEN 49000
    ELSE "monthly_price_cents"
  END,
  "yearly_monthly_price_cents" = CASE
    WHEN "yearly_monthly_price_cents" IN (399, 3900000) THEN 39000
    ELSE "yearly_monthly_price_cents"
  END,
  "currency" = 'VND',
  "updated_at" = NOW()
WHERE "code" = 'STUDENT_PRO';
