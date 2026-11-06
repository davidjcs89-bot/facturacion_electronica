-- Puntos de emision exclusivos de la app nueva. Mientras el sistema anterior siga emitiendo, cada sistema usa
-- sus propios puntos: asi nunca se repite un numero y la app nueva puede emitir en PRODUCCION en los suyos.
-- Si un emisor tiene puntos aqui, la app nueva solo ofrece y numera esos puntos.
CREATE TABLE IF NOT EXISTS public.punto_emision_app (
  id_punto integer PRIMARY KEY REFERENCES public.puntos_emisior(id) ON DELETE CASCADE,
  fecha_asignacion timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'America/Guayaquil')
);
ALTER TABLE public.punto_emision_app ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_facturacion') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.punto_emision_app TO app_facturacion;
    DROP POLICY IF EXISTS app_facturacion_todo ON public.punto_emision_app;
    CREATE POLICY app_facturacion_todo ON public.punto_emision_app FOR ALL TO app_facturacion USING (true) WITH CHECK (true);
  END IF;
END $$;
