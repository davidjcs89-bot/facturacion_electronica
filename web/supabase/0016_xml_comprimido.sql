-- XML autorizado comprimido (gzip) para comprobantes de mas de 2 años; xml_retornado queda NULL en esas filas.
-- Aplicado el 20/11/2026. La app lee xml_retornado o, si es NULL, descomprime xml_retornado_gz.
ALTER TABLE public.documentos_electronicos ADD COLUMN IF NOT EXISTS xml_retornado_gz bytea;
