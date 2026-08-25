ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "galleryUrls" TEXT,
  ADD COLUMN IF NOT EXISTS "isRecommended" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Recipe"
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "galleryUrls" TEXT,
  ADD COLUMN IF NOT EXISTS "isNew" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isRecommended" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

CREATE TABLE IF NOT EXISTS "MediaAsset" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "ownerType" TEXT,
  "ownerId" TEXT,
  "fileName" TEXT NOT NULL,
  "objectPath" TEXT NOT NULL,
  "publicUrl" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "altFr" TEXT,
  "altEn" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MediaAsset_objectPath_key" ON "MediaAsset"("objectPath");
CREATE INDEX IF NOT EXISTS "MediaAsset_kind_status_idx" ON "MediaAsset"("kind", "status");
CREATE INDEX IF NOT EXISTS "MediaAsset_ownerType_ownerId_idx" ON "MediaAsset"("ownerType", "ownerId");

CREATE TABLE IF NOT EXISTS "Advertisement" (
  "id" TEXT NOT NULL,
  "placement" TEXT NOT NULL DEFAULT 'home',
  "titleFr" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "bodyFr" TEXT,
  "bodyEn" TEXT,
  "imageUrl" TEXT NOT NULL,
  "imageAltFr" TEXT NOT NULL,
  "imageAltEn" TEXT NOT NULL,
  "linkUrl" TEXT NOT NULL DEFAULT '/',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Advertisement_placement_status_priority_idx" ON "Advertisement"("placement", "status", "priority");

CREATE TABLE IF NOT EXISTS "AdminMembership" (
  "id" TEXT NOT NULL,
  "authUserId" TEXT,
  "email" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "role" TEXT NOT NULL,
  "permissions" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'invited',
  "invitedBy" TEXT NOT NULL,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminMembership_authUserId_key" ON "AdminMembership"("authUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "AdminMembership_email_key" ON "AdminMembership"("email");
CREATE INDEX IF NOT EXISTS "AdminMembership_role_status_idx" ON "AdminMembership"("role", "status");

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'market-media',
  'market-media',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "market_media_public_read" ON storage.objects;
CREATE POLICY "market_media_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'market-media');

DROP POLICY IF EXISTS "market_media_admin_insert" ON storage.objects;
CREATE POLICY "market_media_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'market-media'
  AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN (
    'super_admin', 'direction', 'catalog_manager', 'recipe_manager', 'marketing'
  )
);

DROP POLICY IF EXISTS "market_media_admin_update" ON storage.objects;
CREATE POLICY "market_media_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'market-media'
  AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN (
    'super_admin', 'direction', 'catalog_manager', 'recipe_manager', 'marketing'
  )
)
WITH CHECK (
  bucket_id = 'market-media'
  AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN (
    'super_admin', 'direction', 'catalog_manager', 'recipe_manager', 'marketing'
  )
);

DROP POLICY IF EXISTS "market_media_admin_delete" ON storage.objects;
CREATE POLICY "market_media_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'market-media'
  AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN (
    'super_admin', 'direction', 'catalog_manager', 'recipe_manager', 'marketing'
  )
);

REVOKE ALL ON TABLE "MediaAsset", "Advertisement", "AdminMembership" FROM anon, authenticated;
