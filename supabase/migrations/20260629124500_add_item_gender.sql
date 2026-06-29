ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'unisex';

ALTER TABLE public.items
DROP CONSTRAINT IF EXISTS items_gender_check;

ALTER TABLE public.items
ADD CONSTRAINT items_gender_check
CHECK (gender IN ('mens', 'womens', 'unisex'));

UPDATE public.items
SET gender = 'mens'
WHERE lower(coalesce(name, '')) ~ '(men|mens|training shorts|shorts)'
   OR lower(coalesce(category, '')) ~ '(men|mens|shorts)';

UPDATE public.items
SET gender = 'womens'
WHERE lower(coalesce(name, '')) ~ '(women|womens|ladies|dress|skirt|cardigan|fitted top|high waist)'
   OR lower(coalesce(category, '')) ~ '(women|womens|ladies)';
