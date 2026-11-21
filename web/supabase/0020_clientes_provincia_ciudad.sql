-- Provincia y ciudad (cantón) del cliente
alter table clientes add column if not exists provincia text;
alter table clientes add column if not exists ciudad text;
-- Los clientes a los que se puso la provincia como dirección (21/11/2026) quedan con esa provincia
update clientes set provincia = direccion
where provincia is null and direccion in ('AZUAY','BOLÍVAR','CAÑAR','CARCHI','COTOPAXI','CHIMBORAZO','EL ORO','ESMERALDAS','GUAYAS',
  'IMBABURA','LOJA','LOS RÍOS','MANABÍ','MORONA SANTIAGO','NAPO','PASTAZA','PICHINCHA','TUNGURAHUA','ZAMORA CHINCHIPE','GALÁPAGOS',
  'SUCUMBÍOS','ORELLANA','SANTO DOMINGO DE LOS TSÁCHILAS','SANTA ELENA');
