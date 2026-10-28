export type ItemMenu = { href: string; texto: string };
export type GrupoMenu = { titulo: string; items: ItemMenu[]; soloAdminSistema?: boolean; requiereEmisor?: boolean };

export const MENU: GrupoMenu[] = [
  {
    titulo: 'Comprobantes',
    requiereEmisor: true,
    items: [
      { href: '/facturas', texto: 'Facturas' },
      { href: '/notas-credito', texto: 'Notas de crédito' },
      { href: '/notas-debito', texto: 'Notas de débito' },
      { href: '/retenciones', texto: 'Retenciones' },
      { href: '/guias-remision', texto: 'Guías de remisión' },
      { href: '/liquidaciones', texto: 'Liquidaciones de compra' },
      { href: '/no-autorizados', texto: 'No autorizados' },
    ],
  },
  {
    titulo: 'Ventas y compras',
    requiereEmisor: true,
    items: [
      { href: '/proformas', texto: 'Proformas' },
      { href: '/pedidos', texto: 'Pedidos' },
      { href: '/compras', texto: 'Compras' },
    ],
  },
  {
    titulo: 'Catálogos',
    requiereEmisor: true,
    items: [
      { href: '/clientes', texto: 'Clientes' },
      { href: '/productos', texto: 'Productos' },
      { href: '/transportistas', texto: 'Transportistas' },
      { href: '/atributos-fichas', texto: 'Atributos de fichas' },
    ],
  },
  {
    titulo: 'Inventario',
    requiereEmisor: true,
    items: [
      { href: '/bodegas', texto: 'Bodegas' },
      { href: '/ingresos-bodega', texto: 'Ingreso de existencias' },
      { href: '/existencias', texto: 'Consulta de existencias' },
      { href: '/transferencias', texto: 'Transferencias' },
    ],
  },
  {
    titulo: 'Reportes',
    requiereEmisor: true,
    items: [
      { href: '/reportes/facturas', texto: 'Facturas autorizadas' },
      { href: '/reportes/kardex', texto: 'Kardex de producto' },
    ],
  },
  {
    titulo: 'Configuración',
    requiereEmisor: true,
    items: [
      { href: '/configuracion/emisor', texto: 'Emisor y firma' },
      { href: '/configuracion/puntos-emision', texto: 'Puntos de emisión' },
      { href: '/configuracion/correo', texto: 'Correo de envío' },
      { href: '/configuracion/impresion', texto: 'Impresión' },
    ],
  },
  {
    titulo: 'Administración',
    soloAdminSistema: true,
    items: [
      { href: '/admin/emisores', texto: 'Emisores' },
      { href: '/admin/usuarios', texto: 'Usuarios' },
      { href: '/admin/avisos', texto: 'Avisos' },
      { href: '/admin/correos', texto: 'Cuentas de correo' },
    ],
  },
];
