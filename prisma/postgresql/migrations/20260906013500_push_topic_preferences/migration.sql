ALTER TABLE "PushSubscription"
  ADD COLUMN "orderAlerts" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "systemAlerts" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "recipeAlerts" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "promotionAlerts" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "PushSubscription_enabled_orderAlerts_idx" ON "PushSubscription"("enabled", "orderAlerts");
CREATE INDEX "PushSubscription_enabled_systemAlerts_idx" ON "PushSubscription"("enabled", "systemAlerts");
CREATE INDEX "PushSubscription_enabled_recipeAlerts_idx" ON "PushSubscription"("enabled", "recipeAlerts");
CREATE INDEX "PushSubscription_enabled_promotionAlerts_idx" ON "PushSubscription"("enabled", "promotionAlerts");
