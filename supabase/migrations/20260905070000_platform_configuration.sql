CREATE TABLE IF NOT EXISTS "PlatformConfiguration" (
  "id" TEXT NOT NULL DEFAULT 'primary',
  "supportEmail" TEXT NOT NULL DEFAULT 'bonjour@je-mange-africain.com',
  "supportPhone" TEXT NOT NULL DEFAULT '',
  "supportHoursFr" TEXT NOT NULL DEFAULT 'Du lundi au vendredi, de 9 h à 18 h',
  "supportHoursEn" TEXT NOT NULL DEFAULT 'Monday to Friday, 9am to 6pm',
  "supportResponseHours" INTEGER NOT NULL DEFAULT 48,
  "businessCity" TEXT NOT NULL DEFAULT 'Paris',
  "businessCountry" TEXT NOT NULL DEFAULT 'France',
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformConfiguration_pkey" PRIMARY KEY ("id")
);

REVOKE ALL ON TABLE "PlatformConfiguration" FROM anon, authenticated;
