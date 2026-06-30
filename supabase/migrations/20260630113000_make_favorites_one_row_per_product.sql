WITH ranked AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY user_id, item_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.favorites
)
DELETE FROM public.favorites f
USING ranked r
WHERE f.id = r.id
  AND r.rn > 1;

DROP INDEX IF EXISTS public.favorites_one_product_variant;
DROP INDEX IF EXISTS public.favorites_one_product_without_variant;

ALTER TABLE public.favorites
DROP CONSTRAINT IF EXISTS favorites_user_id_item_id_key;

ALTER TABLE public.favorites
ADD CONSTRAINT favorites_user_id_item_id_key UNIQUE (user_id, item_id);

DROP POLICY IF EXISTS "Users can update own favorites" ON public.favorites;
CREATE POLICY "Users can update own favorites"
ON public.favorites
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT UPDATE ON public.favorites TO authenticated;
