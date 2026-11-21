-- Ciudad y provincia del usuario: caben los nombres completos (p. ej. SANTO DOMINGO DE LOS TSÁCHILAS)
alter table usuario alter column ciudad type varchar(40);
alter table usuario alter column provincia type varchar(40);
