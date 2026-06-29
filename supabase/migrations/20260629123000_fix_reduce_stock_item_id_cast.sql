CREATE OR REPLACE FUNCTION public.reduce_stock_on_order()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.items
  SET stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0)
  WHERE id = CASE
    WHEN NEW.item_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN NEW.item_id::uuid
    ELSE NULL
  END;
  RETURN NEW;
END;
$function$;
