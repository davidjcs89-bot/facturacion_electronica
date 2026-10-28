-- =====================================================================
-- Vista y procedimientos reescritos de SQL Server (T-SQL) a PostgreSQL
-- Los procedimientos con parametro OUTPUT @Report ... FOR JSON PATH, ROOT('data')
-- pasan a ser funciones que devuelven el mismo JSON: {"data":[...]}
-- (igual que FOR JSON: omite propiedades nulas y devuelve NULL si no hay filas)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Vista: vw_comprobantes_no_autorizados
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_comprobantes_no_autorizados
WITH (security_invoker = true) AS
WITH comprobantes AS (
    SELECT f.id_emisor, t.descripcion_doc, f.numero, d.mensajes, d.fecha_modificacion
    FROM public.factura f
    JOIN public.documentos_electronicos d ON f.id = d.id_comprobante
    JOIN public.tipo_documento t ON d.id_tipo_comprobante = t.id
    WHERE d.id_tipo_comprobante = 1
      AND d.mensajes IS NOT NULL
      AND d.id NOT IN (SELECT id FROM public.factura WHERE estado = 6)
    UNION ALL
    SELECT f.id_emisor, t.descripcion_doc, f.numero, d.mensajes, d.fecha_modificacion
    FROM public.liquidacion_compra f
    JOIN public.documentos_electronicos d ON f.id = d.id_comprobante
    JOIN public.tipo_documento t ON d.id_tipo_comprobante = t.id
    WHERE d.id_tipo_comprobante = 2 AND d.mensajes IS NOT NULL
    UNION ALL
    SELECT f.id_emisor, t.descripcion_doc, f.numero, d.mensajes, d.fecha_modificacion
    FROM public.nota_credito f
    JOIN public.documentos_electronicos d ON f.id = d.id_comprobante
    JOIN public.tipo_documento t ON d.id_tipo_comprobante = t.id
    WHERE d.id_tipo_comprobante = 3 AND d.mensajes IS NOT NULL
    UNION ALL
    SELECT f.id_emisior, t.descripcion_doc, f.numero, d.mensajes, d.fecha_modificacion
    FROM public.nota_debito f
    JOIN public.documentos_electronicos d ON f.id = d.id_comprobante
    JOIN public.tipo_documento t ON d.id_tipo_comprobante = t.id
    WHERE d.id_tipo_comprobante = 4 AND d.mensajes IS NOT NULL
    UNION ALL
    SELECT f.id_emisor, t.descripcion_doc, f.numero_comprobante, d.mensajes, d.fecha_modificacion
    FROM public.guia_remision f
    JOIN public.documentos_electronicos d ON f.id = d.id_comprobante
    JOIN public.tipo_documento t ON d.id_tipo_comprobante = t.id
    WHERE d.id_tipo_comprobante = 5 AND d.mensajes IS NOT NULL
    UNION ALL
    SELECT f.id_emisor, t.descripcion_doc, f.numero, d.mensajes, d.fecha_modificacion
    FROM public.retencion f
    JOIN public.documentos_electronicos d ON f.id = d.id_comprobante
    JOIN public.tipo_documento t ON d.id_tipo_comprobante = t.id
    WHERE d.id_tipo_comprobante = 6 AND d.mensajes IS NOT NULL
)
SELECT id_emisor, descripcion_doc AS tipo_comprobantes, numero, mensajes, fecha_modificacion
FROM comprobantes;


-- ---------------------------------------------------------------------
-- Movimientos de kardex de un producto (base comun de los dos kardex)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kardex_movimientos(p_id_producto integer)
RETURNS TABLE (fecha timestamp, referencia text, transaccion text, bodega text,
               ingreso integer, egreso integer, saldo bigint, costo numeric, total numeric)
LANGUAGE sql STABLE
SET search_path = public
AS $$
    WITH trans AS (
        SELECT b.fecha, b.id::text AS id, 'INGRESO DE INVENTARIO'::text AS transaccion, c.nombre::text AS bodega,
               d.cantidad, d.cantidad AS ingreso, 0 AS egreso, 0::numeric AS costo, 0::numeric AS total
        FROM ingresos_bodega b, ingresos_bodega_detalle d, bodegas c
        WHERE d.id_producto = p_id_producto
          AND d.id_ingreso = b.id
          AND b.id_bodega = c.id
        UNION ALL
        SELECT c.fecha_creacion, b.id::text, 'COMPRA', b.nombre,
               d.cantidad, d.cantidad, 0, d.precio, d.cantidad * d.precio
        FROM compra c, detalle_compra d, bodegas b, producto p
        WHERE p.id = p_id_producto
          AND p.codigo = d.codigo
          AND d.id_compra = c.id
          AND c.id_bodega = b.id
          AND c.id_emisor = p.id_emisor
        UNION ALL
        SELECT f.fecha_emision, f.numero, 'FACTURA', c.nombre,
               -1 * dt.cantidad, 0, dt.cantidad, dt.precio_unitario, dt.sub_total
        FROM factura f, detalle_factura dt, bodegas c, puntos_emisior e
        WHERE dt.id_producto = p_id_producto
          AND dt.id_factura = f.id
          AND f.id_punto_emison = e.id
          AND e.id_bodega = c.id
          AND f.estado = 6
        UNION ALL
        SELECT c.fecha_emision, c.numero, 'NOTA DE CREDITO', b.nombre,
               dc.cantidad, 0, dc.cantidad, dc.precio, dc.subtotal
        FROM nota_credito c, detalle_nota_credito dc, bodegas b, puntos_emisior e
        WHERE dc.id_producto = p_id_producto
          AND dc.id_nota_credito = c.id
          AND c.id_punto_emision = e.id
          AND e.id_bodega = c.id
    )
    SELECT t.fecha, t.id, t.transaccion, t.bodega, t.ingreso, t.egreso,
           sum(t.cantidad) OVER (ORDER BY t.fecha) AS saldo, t.costo, t.total
    FROM trans t
$$;


-- ---------------------------------------------------------------------
-- SP_Kardex_fechas  ->  sp_kardex_fechas(id_producto, fecha_desde, fecha_hasta)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_kardex_fechas(p_id_producto integer, p_fecha_desde text, p_fecha_hasta text)
RETURNS json
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT CASE WHEN count(*) = 0 THEN NULL
                ELSE json_build_object('data', json_agg(json_strip_nulls(row_to_json(s)) ORDER BY s.fecha)) END
    FROM kardex_movimientos(p_id_producto) s
    WHERE s.fecha BETWEEN p_fecha_desde::timestamp AND p_fecha_hasta::timestamp
$$;


-- ---------------------------------------------------------------------
-- SP_Kardex_ultimas  ->  sp_kardex_ultimas(id_producto, fecha_desde, fecha_hasta)
-- (como el original, recibe las fechas pero no las usa: devuelve los 10 ultimos movimientos)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_kardex_ultimas(p_id_producto integer, p_fecha_desde text DEFAULT NULL, p_fecha_hasta text DEFAULT NULL)
RETURNS json
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT CASE WHEN count(*) = 0 THEN NULL
                ELSE json_build_object('data', json_agg(json_strip_nulls(row_to_json(u)) ORDER BY u.fecha)) END
    FROM (SELECT * FROM kardex_movimientos(p_id_producto) ORDER BY fecha DESC LIMIT 10) u
$$;


-- ---------------------------------------------------------------------
-- SP_Reporte_Facturas  ->  sp_reporte_facturas(id_emisor, fecha_desde, fecha_hasta)
-- Nombres de las propiedades JSON iguales al original (mayusculas incluidas)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_reporte_facturas(p_id_emisor integer, p_fecha_desde text, p_fecha_hasta text)
RETURNS json
LANGUAGE sql STABLE
SET search_path = public
AS $$
    WITH r AS (
        SELECT
            to_char(f.fecha_emision, 'DD/MM/YYYY')      AS "Fecha_emision",
            f.numero                                    AS "Numero",
            f.clave_de_acceso                           AS "Clave_de_Acceso",
            f.clave_de_acceso                           AS "autorizacion",
            to_char(f.fecha_autorizacion, 'DD/MM/YYYY') AS "fecha_autorizacion",
            f.subtotal_iva                              AS "Subtotal_iva",
            f.subtotal_iva_cero                         AS "Subtotal_iva_cero",
            f.subtotal_no_objeto_iva                    AS "Subtotal_no_objeto_iva",
            f.subtotal_excento_iva                      AS "Subtotal_excento_iva",
            f.valor_iva                                 AS "Valor_iva",
            f.total                                     AS "Total",
            c.identificacion                            AS "nid_cliente",
            c.nombre_cliente                            AS "cliente",
            'AUTORIZADO'::text                          AS "estado",
            concat('Dirección: ', c.direccion, ' | Teléfono: ', c.telefono_movil, ' | Email: ', c.correo) AS "info_adicional",
            string_agg(p.descripcion_form_pago, ' | ')  AS "forma_pago",
            e.ruc                                       AS "ruc_emisor"
        FROM factura f
        JOIN clientes c ON f.id_cliente = c.id
        JOIN emisor e ON f.id_emisor = e.id
        JOIN detalle_pago_factura j ON f.id = j.id_factura
        JOIN formas_de_pago p ON j.id_form_pago = p.id
        WHERE e.id = p_id_emisor
          AND f.estado = 6
          AND substring(f.clave_de_acceso FROM 24 FOR 1) = '2'
          AND f.fecha_emision >= p_fecha_desde::timestamp
          AND f.fecha_emision <= p_fecha_hasta::timestamp
        GROUP BY f.fecha_emision, f.numero, f.clave_de_acceso, f.fecha_autorizacion,
                 f.subtotal_iva, f.subtotal_iva_cero, f.subtotal_no_objeto_iva,
                 f.subtotal_excento_iva, f.valor_iva, f.total, c.identificacion,
                 c.nombre_cliente, c.direccion, c.telefono_movil, c.correo, e.ruc
    )
    SELECT CASE WHEN count(*) = 0 THEN NULL
                ELSE json_build_object('data', json_agg(json_strip_nulls(row_to_json(r))
                                                        ORDER BY to_date(r."Fecha_emision", 'DD/MM/YYYY'), r."Numero")) END
    FROM r
$$;
