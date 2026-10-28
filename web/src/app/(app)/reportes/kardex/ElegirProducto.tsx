'use client';
import { useRouter } from 'next/navigation';
import { BuscadorProducto } from '@/components/comprobante/BuscadorProducto';

export function ElegirProducto({ desde, hasta }: { desde: string; hasta: string }) {
  const r = useRouter();
  return <BuscadorProducto onElegir={(p) => r.push(`/reportes/kardex?producto=${p.id}&desde=${desde}&hasta=${hasta}`)} />;
}
