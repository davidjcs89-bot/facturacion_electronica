-- Cada punto exclusivo de la app tiene su ambiente fijo: asi las pruebas tienen su propia numeracion
-- (p. ej. 001-099 PRUEBAS) y las facturas reales la suya (001-010 PRODUCCION), aunque el emisor este en produccion.
ALTER TABLE public.punto_emision_app ADD COLUMN IF NOT EXISTS ambiente char(1) NOT NULL DEFAULT '2' CHECK (ambiente IN ('1','2'));
COMMENT ON COLUMN public.punto_emision_app.ambiente IS '1 = PRUEBAS, 2 = PRODUCCION. Los comprobantes de este punto se emiten siempre en este ambiente.';

-- Asignacion hecha para DIVAD CLOSET (emisor 14) el 2026-11-06:
--   001-010 (id 95) PRODUCCION y 001-099 (id 96) PRUEBAS, ambos con secuenciales desde 1.
