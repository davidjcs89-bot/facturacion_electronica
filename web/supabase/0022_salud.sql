-- Panel de salud del sistema
create table if not exists uso_voz (
  id bigserial primary key,
  fecha timestamp not null default (now() at time zone 'America/Guayaquil'),
  id_emisor int,
  tipo text not null,            -- 'audio' (Groq), 'claude' (interpretación), 'factura' (creada por voz)
  tokens_entrada int,
  tokens_salida int,
  restantes_dia int              -- solicitudes que Groq dice que quedan hoy
);
create index if not exists uso_voz_fecha on uso_voz (fecha);
alter table uso_voz enable row level security;
-- Correos: saber si salió por el Gmail del sistema; los envíos del sistema sin comprobante no tienen empresa
alter table envio_correo add column if not exists via_sistema boolean not null default false;
alter table envio_correo alter column id_emisor drop not null;
create index if not exists envio_correo_fecha on envio_correo (fecha);
