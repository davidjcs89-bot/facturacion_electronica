-- Tarifas de IVA vigentes que faltaban (aplicado el 21/11/2026 desde el editor SQL).
-- 5 %: materiales de construcción (lista del SRI); 8 %: servicios turísticos en feriados por decreto.
-- El 12 % (id 2) y el 14 % (id 3) se conservan por los comprobantes antiguos, pero la app ya no los ofrece.
insert into porcentaje_impuesto_producto (id, id_impuesto, descripcion, codigo, porcentaje)
select 102, 4, '5% (materiales de construcción)', '5', 5 where not exists (select 1 from porcentaje_impuesto_producto where id = 102)
union all
select 103, 4, '8% (turismo en feriados)', '8', 8 where not exists (select 1 from porcentaje_impuesto_producto where id = 103);
