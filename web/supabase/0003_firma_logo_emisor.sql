-- Archivos del emisor guardados en la base (la app anterior los tenia en el disco del servidor)
CREATE TABLE IF NOT EXISTS public.firma_emisor (
  id_emisor integer PRIMARY KEY REFERENCES public.emisor(id) ON DELETE CASCADE,
  archivo bytea NOT NULL,
  nombre_archivo text,
  clave_cifrada text NOT NULL,
  titular text,
  valido_desde timestamp,
  valido_hasta timestamp,
  fecha_carga timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'America/Guayaquil')
);
CREATE TABLE IF NOT EXISTS public.logo_emisor (
  id_emisor integer PRIMARY KEY REFERENCES public.emisor(id) ON DELETE CASCADE,
  contenido bytea NOT NULL,
  tipo_mime text NOT NULL,
  fecha_carga timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'America/Guayaquil')
);
ALTER TABLE public.firma_emisor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logo_emisor ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_facturacion') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.firma_emisor, public.logo_emisor TO app_facturacion;
    DROP POLICY IF EXISTS app_facturacion_todo ON public.firma_emisor;
    DROP POLICY IF EXISTS app_facturacion_todo ON public.logo_emisor;
    CREATE POLICY app_facturacion_todo ON public.firma_emisor FOR ALL TO app_facturacion USING (true) WITH CHECK (true);
    CREATE POLICY app_facturacion_todo ON public.logo_emisor FOR ALL TO app_facturacion USING (true) WITH CHECK (true);
  END IF;
END $$;
-- Indices utiles para las consultas de la app
CREATE INDEX IF NOT EXISTS ix_factura_emisor_fecha ON public.factura (id_emisor, fecha_emision DESC);
CREATE INDEX IF NOT EXISTS ix_detalle_factura_factura ON public.detalle_factura (id_factura);
CREATE INDEX IF NOT EXISTS ix_detalle_pago_factura_factura ON public.detalle_pago_factura (id_factura);
CREATE INDEX IF NOT EXISTS ix_docs_comprobante ON public.documentos_electronicos (id_tipo_comprobante, id_comprobante);
CREATE INDEX IF NOT EXISTS ix_clientes_emisor ON public.clientes (id_emisor, nombre_cliente);
CREATE INDEX IF NOT EXISTS ix_producto_emisor ON public.producto (id_emisor, nombre);
CREATE INDEX IF NOT EXISTS ix_nota_credito_emisor ON public.nota_credito (id_emisor, fecha_emision DESC);
CREATE INDEX IF NOT EXISTS ix_nota_debito_emisor ON public.nota_debito (id_emisior, fecha_emision DESC);
CREATE INDEX IF NOT EXISTS ix_retencion_emisor ON public.retencion (id_emisor, fecha_emision DESC);
CREATE INDEX IF NOT EXISTS ix_guia_emisor ON public.guia_remision (id_emisor, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS ix_liquidacion_emisor ON public.liquidacion_compra (id_emisor, fecha_emision DESC);
