-- Use POSIX character classes in Postgres regexes.
-- The previous \s pattern can be interpreted in ways that reject valid emails.

do $outer$
declare
  v_def text;
begin
  v_def := pg_get_functiondef('public.place_order(jsonb)'::regprocedure);
  v_def := replace(
    v_def,
    $txt$if nullif(trim(coalesce(p_order->>'customer_email', '')), '') !~* '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' then$txt$,
    $txt$if nullif(trim(coalesce(p_order->>'customer_email', '')), '') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then$txt$
  );
  v_def := replace(
    v_def,
    $txt$if nullif(trim(coalesce(p_order->>'customer_phone', '')), '') !~ '^[0-9+\\-\\s()]{7,20}$' then$txt$,
    $txt$if nullif(trim(coalesce(p_order->>'customer_phone', '')), '') !~ '^[0-9+()[:space:]-]{7,20}$' then$txt$
  );
  execute v_def;
end;
$outer$;

notify pgrst, 'reload schema';
