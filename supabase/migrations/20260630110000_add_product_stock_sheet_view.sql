CREATE OR REPLACE VIEW public.product_stock_sheet
WITH (security_invoker = true)
AS
SELECT
  i.id AS product_id,
  i.name AS product_name,
  i.gender,
  i.category,
  i.price_egp,
  i.stock_quantity AS total_product_stock,
  i.sold_out AS product_sold_out,
  pv.id AS variant_id,
  pv.color,
  pv.size,
  CASE pv.size
    WHEN 'S' THEN 1
    WHEN 'M' THEN 2
    WHEN 'L' THEN 3
    WHEN 'XL' THEN 4
    WHEN 'XXL' THEN 5
    ELSE 99
  END AS size_order,
  pv.stock_quantity AS variant_stock,
  (pv.stock_quantity <= 0) AS variant_sold_out,
  COALESCE(pv.image_url, i.image_url) AS display_image_url,
  i.image_url AS product_image_url,
  pv.image_url AS variant_image_url,
  i.created_at AS product_created_at
FROM public.items i
LEFT JOIN public.product_variants pv ON pv.item_id = i.id
ORDER BY i.created_at DESC, i.name ASC, pv.color ASC, size_order ASC;

GRANT SELECT ON public.product_stock_sheet TO anon, authenticated;

COMMENT ON VIEW public.product_stock_sheet IS 'Client-friendly read-only stock sheet. Use this to understand products, colors, sizes, stock, price, and images without editing backend tables.';
