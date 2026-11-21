-- Avisos que se pueden activar o desactivar (aplicado el 21/11/2026; los existentes quedaron desactivados)
alter table avisos add column if not exists activo boolean not null default true;
