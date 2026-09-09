UPDATE "Category"
SET "color" = CASE
  WHEN "slug" = 'poissons' THEN '#8A3042'
  WHEN "slug" = 'legumes' THEN '#B9472B'
  ELSE "color"
END
WHERE "slug" IN ('poissons', 'legumes') AND "color" = '#3F681C';
