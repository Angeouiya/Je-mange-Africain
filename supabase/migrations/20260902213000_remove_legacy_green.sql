ALTER TABLE "Recipe" ALTER COLUMN "imageColor" SET DEFAULT '#8A3042';

UPDATE "Category" SET "color" = '#8A3042' WHERE LOWER("color") = '#3f681c';
UPDATE "Product" SET "imageColor" = '#8A3042' WHERE LOWER("imageColor") = '#3f681c';
UPDATE "Recipe" SET "imageColor" = '#8A3042' WHERE LOWER("imageColor") = '#3f681c';
