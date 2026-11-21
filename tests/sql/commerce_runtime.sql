-- Smoke-test the replacement commerce schema in the disposable CI database.
DO $$
DECLARE
  required_table TEXT;
  required_tables TEXT[] := ARRAY[
    'mevo_products','mevo_product_variants','mevo_customers','mevo_customer_addresses',
    'mevo_orders','mevo_order_items','mevo_order_status_history','mevo_payment_attempts',
    'payment_webhook_events','mevo_stock_reservations','mevo_coupons','mevo_shipping_methods',
    'mevo_store_settings','mevo_promotional_banners','mevo_product_reviews',
    'mevo_price_alerts','mevo_customer_favourites','mevo_carts',
    'mevo_newsletter_subscriptions','mevo_contact_messages','mevo_audit_events',
    'mevo_inventory_movements','mevo_support_cases','mevo_support_case_events'
  ];
BEGIN
  FOREACH required_table IN ARRAY required_tables LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION 'Missing required commerce table: %', required_table;
    END IF;
  END LOOP;
  IF (SELECT COUNT(*) FROM mevo_products) <> 0 THEN
    RAISE EXCEPTION 'A fresh commerce schema must not seed demo products';
  END IF;
  IF (SELECT COUNT(*) FROM mevo_customers) <> 0 THEN
    RAISE EXCEPTION 'A fresh commerce schema must not seed demo customers';
  END IF;
  IF (SELECT COUNT(*) FROM mevo_orders) <> 0 THEN
    RAISE EXCEPTION 'A fresh commerce schema must not seed demo orders';
  END IF;
END $$;

-- Validate stock bounds are enforced by the database itself.
DO $$
BEGIN
  INSERT INTO mevo_products (id,sku,slug,name,price_cents,stock_on_hand,stock_reserved)
  VALUES ('ci-product','CI-SKU','ci-product','CI Product',1000,1,2);
  RAISE EXCEPTION 'Expected stock_reserved constraint to reject oversubscription';
EXCEPTION WHEN check_violation THEN
  NULL;
END $$;
