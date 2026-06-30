ALTER TABLE public.favorites
ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE;

ALTER TABLE public.favorites
DROP CONSTRAINT IF EXISTS favorites_user_id_item_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS favorites_one_product_without_variant
ON public.favorites (user_id, item_id)
WHERE variant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS favorites_one_product_variant
ON public.favorites (user_id, variant_id)
WHERE variant_id IS NOT NULL;
