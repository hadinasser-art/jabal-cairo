CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  color text NOT NULL,
  size text NOT NULL,
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  image_url text,
  sku text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, color, size)
);

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read product variants" ON public.product_variants;
CREATE POLICY "Public can read product variants"
ON public.product_variants
FOR SELECT
TO anon, authenticated
USING (true);

DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON public.product_variants;
CREATE OR REPLACE FUNCTION public.set_product_variants_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.set_product_variants_updated_at();

CREATE OR REPLACE FUNCTION public.sync_item_stock_from_variants()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  target_item_id uuid;
BEGIN
  target_item_id := COALESCE(NEW.item_id, OLD.item_id);

  UPDATE public.items
  SET
    stock_quantity = COALESCE((
      SELECT SUM(stock_quantity)::integer
      FROM public.product_variants
      WHERE item_id = target_item_id
    ), 0),
    sold_out = COALESCE((
      SELECT SUM(stock_quantity)::integer
      FROM public.product_variants
      WHERE item_id = target_item_id
    ), 0) <= 0
  WHERE id = target_item_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_item_stock_from_variants ON public.product_variants;
CREATE TRIGGER trg_sync_item_stock_from_variants
AFTER INSERT OR UPDATE OF stock_quantity OR DELETE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.sync_item_stock_from_variants();

CREATE OR REPLACE FUNCTION public.reduce_stock_on_order()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE public.product_variants
    SET stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0)
    WHERE id = NEW.variant_id;
  ELSE
    UPDATE public.items
    SET stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0)
    WHERE id = CASE
      WHEN NEW.item_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN NEW.item_id::uuid
      ELSE NULL
    END;
  END IF;
  RETURN NEW;
END;
$function$;
