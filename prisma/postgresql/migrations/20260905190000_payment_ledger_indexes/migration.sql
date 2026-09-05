CREATE INDEX "Payment_orderId_createdAt_idx" ON "Payment"("orderId", "createdAt");
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
CREATE INDEX "Payment_method_createdAt_idx" ON "Payment"("method", "createdAt");

CREATE INDEX "Refund_orderId_createdAt_idx" ON "Refund"("orderId", "createdAt");
CREATE INDEX "Refund_status_createdAt_idx" ON "Refund"("status", "createdAt");
