-- Formato de impresion y comportamiento al emitir, por empresa (Configuracion -> Impresion).
-- Sin fila para un emisor = ticket de 80 mm y preguntar al emitir (igual que el sistema anterior, que imprimia ticket).
CREATE TABLE IF NOT EXISTS public.impresion_emisor (
  id_emisor integer PRIMARY KEY REFERENCES public.emisor(id) ON DELETE CASCADE,
  formato varchar(10) NOT NULL DEFAULT 'ticket80' CHECK (formato IN ('a4', 'ticket80', 'ticket58')),
  al_emitir varchar(10) NOT NULL DEFAULT 'preguntar' CHECK (al_emitir IN ('preguntar', 'siempre', 'nunca')),
  fecha_modificacion timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'America/Guayaquil')
);
COMMENT ON TABLE public.impresion_emisor IS 'Formato de impresion (a4 / ticket80 / ticket58) y accion al emitir (preguntar / siempre / nunca) por emisor';
ALTER TABLE public.impresion_emisor ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.impresion_emisor FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.impresion_emisor TO app_facturacion;
DROP POLICY IF EXISTS app_facturacion_todo ON public.impresion_emisor;
CREATE POLICY app_facturacion_todo ON public.impresion_emisor FOR ALL TO app_facturacion USING (true) WITH CHECK (true);
