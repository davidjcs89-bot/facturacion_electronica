import type { MetadataRoute } from 'next';

/** App instalable: «Agregar a pantalla de inicio» la abre a pantalla completa */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Facturación Electrónica',
    short_name: 'Facturación',
    description: 'Emisión de comprobantes electrónicos SRI',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f4f6f9',
    theme_color: '#ffffff',
    lang: 'es',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
