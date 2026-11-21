import Link from 'next/link';
import { requerirAdminSistema } from '@/lib/auth';
import { Cabecera } from '@/components/ui';
import { fecha, fechaHora, money } from '@/lib/formato';
import { datosSalud, LIMITES, ALERTA_PCT, AVISO_PCT } from '@/lib/salud';

export const dynamic = 'force-dynamic';

const color = (p: number) => (p >= ALERTA_PCT ? 'var(--danger)' : p >= AVISO_PCT ? 'var(--warn)' : 'var(--ok)');
const n = (x: number) => x.toLocaleString('es-EC');

function Medidor({ t, usado, total, unidad, nota }: { t: string; usado: number; total: number; unidad: string; nota?: string }) {
  const p = Math.round((usado / total) * 100);
  return (
    <div className="salud-medidor">
      <div className="tab-fila"><span>{t}</span><strong style={{ color: color(p) }}>{p} %</strong></div>
      <div className="salud-barra"><div style={{ width: `${Math.min(p, 100)}%`, background: color(p) }} /></div>
      <span className="muted chico">{n(usado)} de {n(total)} {unidad}{nota ? ` · ${nota}` : ''}</span>
    </div>
  );
}
function Dato({ t, v, sub, tono }: { t: string; v: React.ReactNode; sub?: React.ReactNode; tono?: 'rojo' | 'ambar' }) {
  return (
    <div className="salud-dato">
      <span>{t}{sub && <><br /><span className="muted chico">{sub}</span></>}</span>
      <strong style={{ color: tono === 'rojo' ? 'var(--danger)' : tono === 'ambar' ? 'var(--warn)' : undefined }}>{v}</strong>
    </div>
  );
}
function Tarjeta({ titulo, estado, children }: { titulo: string; estado: 'ok' | 'ambar' | 'rojo'; children: React.ReactNode }) {
  const t = { ok: 'Bien', ambar: 'Atención', rojo: 'Alerta' }[estado];
  return (
    <section className="card salud-tarjeta">
      <div className="tab-fila" style={{ marginBottom: 4 }}><strong>{titulo}</strong><span className={`salud-estado ${estado}`}>{t}</span></div>
      {children}
    </section>
  );
}
const est = (...ps: number[]) => { const m = Math.max(...ps); return m >= ALERTA_PCT ? 'rojo' : m >= AVISO_PCT ? 'ambar' : 'ok'; };

export default async function Salud() {
  await requerirAdminSistema();
  const d = await datosSalud();
  const ahora = new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' }).format(new Date());
  const rojas = d.alertas.filter((a) => a.nivel === 'rojo');
  return (
    <div className="tablero">
      <Cabecera titulo="Salud del sistema" sub={`Actualizado ${ahora} · se calcula al abrir`}>
        <Link href="/admin/salud" className="btn">Actualizar</Link>
      </Cabecera>
      {d.alertas.length > 0 ? (
        <div className={`tab-alerta ${rojas.length ? 'rojo' : 'ambar'}`} style={{ marginBottom: 14 }}>
          <strong>{d.alertas.length}</strong>
          <span><strong>{d.alertas.length === 1 ? 'Alerta' : 'Alertas'}</strong><span>{d.alertas.map((a) => a.texto).join(' · ')}</span></span>
        </div>
      ) : (
        <div className="tab-alerta verde" style={{ marginBottom: 14 }}><strong>✓</strong><span><strong>Todo en orden</strong><span>Ningún recurso pasa del {AVISO_PCT} %</span></span></div>
      )}
      <div className="salud-grid">
        <Tarjeta titulo="Correos de hoy" estado={d.correos.fallidos ? (est(d.medidas.gmail) === 'ok' ? 'ambar' : est(d.medidas.gmail)) : est(d.medidas.gmail)}>
          <Medidor t="Correo del sistema (Gmail)" usado={d.correos.sistema} total={LIMITES.gmailDia} unidad="correos" nota="se reinicia cada día" />
          <Dato t="Enviados con el correo de cada empresa" v={n(d.correos.empresa)} />
          <Dato t="Fallidos (7 días)" v={n(d.correos.fallidos)} tono={d.correos.fallidos ? 'rojo' : undefined} sub="Cada empresa los ve en su Inicio" />
        </Tarjeta>
        <Tarjeta titulo="SRI (todas las empresas)" estado={d.sri.rechazados || d.firmas.some((f) => f.dias <= 15) ? 'rojo' : d.sri.sin_respuesta || d.firmas.length ? 'ambar' : 'ok'}>
          <Dato t="Rechazados hoy" v={n(d.sri.rechazados)} tono={d.sri.rechazados ? 'rojo' : undefined} />
          <Dato t="En proceso hoy" v={n(d.sri.en_proceso)} />
          <Dato t="Sin respuesta del SRI hoy" v={n(d.sri.sin_respuesta)} tono={d.sri.sin_respuesta ? 'ambar' : undefined} />
          <Dato t="Último autorizado" v={d.sri.ultimo ? fechaHora(d.sri.ultimo) : '—'} />
          <Dato t="Firmas que vencen en 30 días" v={d.firmas.length} tono={d.firmas.some((f) => f.dias <= 15) ? 'rojo' : d.firmas.length ? 'ambar' : undefined}
            sub={d.firmas.map((f) => `${f.empresa} · ${f.dias < 0 ? 'venció' : 'vence'} el ${fecha(f.vence)}`).join(' / ') || undefined} />
        </Tarjeta>
        <Tarjeta titulo="Base de datos (Supabase gratis)" estado={est(d.medidas.base, d.medidas.conexiones)}>
          <Medidor t="Tamaño" usado={d.base.mb} total={LIMITES.baseMB} unidad="MB" />
          <Medidor t="Conexiones abiertas" usado={d.base.conexiones} total={LIMITES.conexiones} unidad="" />
          <span className="muted chico" style={{ paddingTop: 6 }}>Más pesadas: {d.tablas.map((t) => `${t.tabla.replaceAll('_', ' ')} ${t.mb} MB`).join(' · ')}</span>
        </Tarjeta>
        <Tarjeta titulo="Facturas por voz" estado={est(d.medidas.groq)}>
          <Medidor t="Groq — audios de hoy" usado={d.voz.audiosUsados} total={LIMITES.groqDia} unidad="audios" nota="límite gratis por día" />
          <Dato t="Facturas por voz este mes" v={n(d.voz.facturas_mes)} />
          <Dato t="Claude — uso estimado del mes" v={`$${money(d.voz.claudeUSD)}`} sub="Según los tokens usados; el total real está en la consola de Claude" />
        </Tarjeta>
        <Tarjeta titulo="Vercel (plan gratis)" estado="ok">
          <div style={{ fontSize: 13, lineHeight: 1.45, paddingTop: 4 }}>Vercel no entrega estas cifras por su API en el plan gratis. Te avisa por correo cuando te acercas al límite.</div>
          <a href="https://vercel.com/davidjcs89/~/usage" target="_blank" rel="noreferrer" style={{ fontSize: 13, paddingTop: 8 }}>Abrir el consumo en Vercel ›</a>
        </Tarjeta>
      </div>
    </div>
  );
}
