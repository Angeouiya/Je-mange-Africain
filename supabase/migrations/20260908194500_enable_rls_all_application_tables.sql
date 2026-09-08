DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Address', 'AdminMembership', 'Advertisement', 'AuditLog', 'Brand', 'Carrier', 'Category',
    'ContactMessage', 'Customer', 'DeliveryZone', 'Favorite', 'GiftCard', 'InventoryBatch',
    'LegalConsent', 'MediaAsset', 'Notification', 'Order', 'OrderBatchAllocation', 'OrderEvent',
    'OrderItem', 'Payment', 'Permission', 'PlatformConfiguration', 'Product', 'ProductAlias',
    'ProductTranslation', 'ProductVariant', 'Promotion', 'PurchaseOrder', 'PurchaseOrderItem',
    'PushSubscription', 'Recipe', 'RecipeIngredient', 'RecipeTranslation', 'Refund', 'SavedRecipe',
    'Shipment', 'StockMovement', 'Supplier', 'SupportTicket', 'User', 'Warehouse',
    'WarehouseLocation', 'WholesaleQuote', 'WholesaleQuoteItem'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated;
