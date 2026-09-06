ALTER TABLE "PlatformConfiguration"
  ALTER COLUMN "supportPhone" SET DEFAULT '+33 7 69 59 16 42',
  ALTER COLUMN "businessCity" SET DEFAULT 'Montreuil';

UPDATE "PlatformConfiguration"
SET
  "supportPhone" = CASE WHEN "supportPhone" = '' THEN '+33 7 69 59 16 42' ELSE "supportPhone" END,
  "businessCity" = CASE WHEN "businessCity" = 'Paris' THEN 'Montreuil' ELSE "businessCity" END
WHERE "id" = 'primary';
