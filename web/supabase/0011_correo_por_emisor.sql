-- 0011 · Correo de envío por empresa (decidido por David el 28/10/2026 y el 03/11/2026).
-- Cada emisor envía sus comprobantes, proformas y pedidos desde su propio servidor de correo (SMTP).
-- El cliente ve como remitente el nombre comercial del emisor. La clave va cifrada (AES-256-GCM,
-- llave FIRMAS_SECRET) y nunca vuelve al navegador. La tabla cuentas_correo queda solo para los
-- correos del sistema (recuperar clave).
create table if not exists public.emisor_correo (
  id_emisor integer primary key references public.emisor(id) on delete cascade,
  direccion varchar(254) not null,
  servidor varchar(253) not null check (servidor ~ '^[A-Za-z0-9]([A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$'),
  puerto integer not null check (puerto in (25, 465, 587, 2525)),
  seguridad text not null check (seguridad in ('SSL', 'STARTTLS')),
  usuario varchar(254) not null,
  clave_cifrada text not null,
  copia_a varchar(254),
  verificado_en timestamp,
  fecha_modificacion timestamp not null default (now() at time zone 'America/Guayaquil')
);
alter table public.emisor_correo enable row level security;
revoke all on public.emisor_correo from anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'app_facturacion') then
    grant select, insert, update, delete on public.emisor_correo to app_facturacion;
    drop policy if exists app_facturacion_todo on public.emisor_correo;
    create policy app_facturacion_todo on public.emisor_correo for all to app_facturacion using (true) with check (true);
  end if;
end $$;
