-- Notas de credito: precio con 3 decimales (igual que detalle_factura) y porcentaje de IVA aplicado en cada linea
ALTER TABLE public.detalle_nota_credito ALTER COLUMN precio TYPE numeric(18,3);
ALTER TABLE public.detalle_nota_credito ADD COLUMN IF NOT EXISTS id_porcentaje_iva integer REFERENCES public.porcentaje_impuesto_producto(id);
CREATE INDEX IF NOT EXISTS ix_detalle_nota_credito_nota ON public.detalle_nota_credito (id_nota_credito);
CREATE INDEX IF NOT EXISTS ix_nota_credito_factura ON public.nota_credito (id_factura_devolver);
CREATE INDEX IF NOT EXISTS ix_nota_debito_factura ON public.nota_debito (id_factura_modifica);
-- Enlace con la linea de la factura (una factura puede repetir el mismo producto en varias lineas) y su descripcion
ALTER TABLE public.detalle_nota_credito ADD COLUMN IF NOT EXISTS id_detalle_factura integer REFERENCES public.detalle_factura(id);
ALTER TABLE public.detalle_nota_credito ADD COLUMN IF NOT EXISTS descripcion varchar(300);
