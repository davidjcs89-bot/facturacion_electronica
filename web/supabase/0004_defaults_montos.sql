-- Montos en cero por defecto (simplifica crear borradores de comprobantes)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT table_name, column_name FROM information_schema.columns
           WHERE table_schema = 'public' AND data_type = 'numeric' AND column_default IS NULL LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT 0', r.table_name, r.column_name);
  END LOOP;
END $$;
