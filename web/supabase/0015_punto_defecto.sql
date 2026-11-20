-- Punto de emision que se selecciona por defecto al crear un comprobante (Configuracion -> Puntos de emision).
ALTER TABLE public.emisor ADD COLUMN IF NOT EXISTS id_punto_defecto integer REFERENCES public.puntos_emisior(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.emisor.id_punto_defecto IS 'Punto de emision preseleccionado al crear comprobantes; null = el primero de la lista';
