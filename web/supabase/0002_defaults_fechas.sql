DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT table_name, column_name FROM information_schema.columns
           WHERE table_schema = 'public' AND column_name IN ('fecha_creacion', 'fecha_modificacion', 'createon')
             AND column_default IS NULL AND data_type LIKE 'timestamp%' LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT (now() AT TIME ZONE ''America/Guayaquil'')', r.table_name, r.column_name);
  END LOOP;
END $$;
