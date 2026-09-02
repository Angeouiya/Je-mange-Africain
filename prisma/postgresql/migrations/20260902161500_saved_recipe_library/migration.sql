CREATE TABLE IF NOT EXISTS "SavedRecipe" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedRecipe_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SavedRecipe_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SavedRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SavedRecipe_customerId_recipeId_key"
  ON "SavedRecipe"("customerId", "recipeId");
