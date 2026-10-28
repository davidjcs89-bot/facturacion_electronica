# Facturación Electrónica (app web)

Reconstrucción de la app ASP.NET anterior en **Next.js** (Vercel) con base **PostgreSQL en Supabase**.

## Módulos
- Comprobantes electrónicos SRI: facturas, notas de crédito, notas de débito, retenciones, guías de remisión y liquidaciones de compra (XML, firma XAdES-BES, envío y autorización SRI, RIDE en PDF, correo al cliente).
- Ventas y compras: proformas, pedidos con abonos, compras (manual o importando el XML del proveedor).
- Catálogos: clientes (fichas y notas), productos, transportistas.
- Inventario: bodegas, ingresos, existencias, transferencias.
- Reportes: facturas autorizadas (CSV), kardex.
- Configuración: emisor, firma electrónica (.p12), logo, puntos de emisión y secuenciales, impresión.
- Administración: emisores y habilitación, usuarios, avisos, cuentas de correo.

## Variables de entorno
Ver `.env.example`. `EMISION_HABILITADA=false` bloquea la emisión en ambiente de **producción** (en pruebas siempre se permite) mientras el sistema anterior siga emitiendo con los mismos secuenciales.

## Base de datos
Los cambios aplicados a la base migrada están en `supabase/`.

## Desarrollo
```
npm install
npm run dev
```
