-- Registro pequeño de cada envío de comprobante por correo (para el tablero: «Correos que fallaron»)
create table if not exists envio_correo (
  id bigserial primary key,
  id_emisor int not null,
  id_tipo_comprobante int,
  id_comprobante int,
  destino text,
  ok boolean not null,
  error text,
  fecha timestamp not null default (now() at time zone 'America/Guayaquil')
);
create index if not exists envio_correo_emisor_fecha on envio_correo (id_emisor, fecha desc) where not ok;
alter table envio_correo enable row level security;
