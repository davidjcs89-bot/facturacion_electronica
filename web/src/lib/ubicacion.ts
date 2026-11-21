/**
 * Provincias y cantones del Ecuador (24 provincias, 222 cantones; el 222 es Sevilla Don Bosco,
 * Morona Santiago, creado en noviembre de 2024). El código es el de los 2 primeros dígitos de la cédula/RUC.
 * Se guardan en mayúsculas, como el resto de datos del cliente.
 */
export const PROVINCIAS: { cod: string; nombre: string; cantones: string[] }[] = [
  { cod: '01', nombre: 'AZUAY', cantones: ['CUENCA', 'CAMILO PONCE ENRÍQUEZ', 'CHORDELEG', 'EL PAN', 'GIRÓN', 'GUACHAPALA', 'GUALACEO', 'NABÓN', 'OÑA', 'PAUTE', 'PUCARÁ', 'SAN FERNANDO', 'SANTA ISABEL', 'SEVILLA DE ORO', 'SÍGSIG'] },
  { cod: '02', nombre: 'BOLÍVAR', cantones: ['GUARANDA', 'CALUMA', 'CHILLANES', 'CHIMBO', 'ECHEANDÍA', 'LAS NAVES', 'SAN MIGUEL'] },
  { cod: '03', nombre: 'CAÑAR', cantones: ['AZOGUES', 'BIBLIÁN', 'CAÑAR', 'DÉLEG', 'EL TAMBO', 'LA TRONCAL', 'SUSCAL'] },
  { cod: '04', nombre: 'CARCHI', cantones: ['TULCÁN', 'BOLÍVAR', 'ESPEJO', 'MIRA', 'MONTÚFAR', 'SAN PEDRO DE HUACA'] },
  { cod: '05', nombre: 'COTOPAXI', cantones: ['LATACUNGA', 'LA MANÁ', 'PANGUA', 'PUJILÍ', 'SALCEDO', 'SAQUISILÍ', 'SIGCHOS'] },
  { cod: '06', nombre: 'CHIMBORAZO', cantones: ['RIOBAMBA', 'ALAUSÍ', 'CHAMBO', 'CHUNCHI', 'COLTA', 'CUMANDÁ', 'GUAMOTE', 'GUANO', 'PALLATANGA', 'PENIPE'] },
  { cod: '07', nombre: 'EL ORO', cantones: ['MACHALA', 'ARENILLAS', 'ATAHUALPA', 'BALSAS', 'CHILLA', 'EL GUABO', 'HUAQUILLAS', 'LAS LAJAS', 'MARCABELÍ', 'PASAJE', 'PIÑAS', 'PORTOVELO', 'SANTA ROSA', 'ZARUMA'] },
  { cod: '08', nombre: 'ESMERALDAS', cantones: ['ESMERALDAS', 'ATACAMES', 'ELOY ALFARO', 'MUISNE', 'QUININDÉ', 'RIOVERDE', 'SAN LORENZO'] },
  { cod: '09', nombre: 'GUAYAS', cantones: ['GUAYAQUIL', 'ALFREDO BAQUERIZO MORENO', 'BALAO', 'BALZAR', 'COLIMES', 'CORONEL MARCELINO MARIDUEÑA', 'DAULE', 'DURÁN', 'EL EMPALME', 'EL TRIUNFO', 'GENERAL ANTONIO ELIZALDE', 'ISIDRO AYORA', 'LOMAS DE SARGENTILLO', 'MILAGRO', 'NARANJAL', 'NARANJITO', 'NOBOL', 'PALESTINA', 'PEDRO CARBO', 'PLAYAS', 'SALITRE', 'SAMBORONDÓN', 'SANTA LUCÍA', 'SIMÓN BOLÍVAR', 'YAGUACHI'] },
  { cod: '10', nombre: 'IMBABURA', cantones: ['IBARRA', 'ANTONIO ANTE', 'COTACACHI', 'OTAVALO', 'PIMAMPIRO', 'SAN MIGUEL DE URCUQUÍ'] },
  { cod: '11', nombre: 'LOJA', cantones: ['LOJA', 'CALVAS', 'CATAMAYO', 'CELICA', 'CHAGUARPAMBA', 'ESPÍNDOLA', 'GONZANAMÁ', 'MACARÁ', 'OLMEDO', 'PALTAS', 'PINDAL', 'PUYANGO', 'QUILANGA', 'SARAGURO', 'SOZORANGA', 'ZAPOTILLO'] },
  { cod: '12', nombre: 'LOS RÍOS', cantones: ['BABAHOYO', 'BABA', 'BUENA FE', 'MOCACHE', 'MONTALVO', 'PALENQUE', 'PUEBLOVIEJO', 'QUEVEDO', 'QUINSALOMA', 'URDANETA', 'VALENCIA', 'VENTANAS', 'VINCES'] },
  { cod: '13', nombre: 'MANABÍ', cantones: ['PORTOVIEJO', 'BOLÍVAR', 'CHONE', 'EL CARMEN', 'FLAVIO ALFARO', 'JAMA', 'JARAMIJÓ', 'JIPIJAPA', 'JUNÍN', 'MANTA', 'MONTECRISTI', 'OLMEDO', 'PAJÁN', 'PEDERNALES', 'PICHINCHA', 'PUERTO LÓPEZ', 'ROCAFUERTE', 'SAN VICENTE', 'SANTA ANA', 'SUCRE', 'TOSAGUA', 'VEINTICUATRO DE MAYO'] },
  { cod: '14', nombre: 'MORONA SANTIAGO', cantones: ['MORONA', 'GUALAQUIZA', 'HUAMBOYA', 'LIMÓN INDANZA', 'LOGROÑO', 'PABLO SEXTO', 'PALORA', 'SAN JUAN BOSCO', 'SANTIAGO', 'SEVILLA DON BOSCO', 'SUCÚA', 'TAISHA', 'TIWINTZA'] },
  { cod: '15', nombre: 'NAPO', cantones: ['TENA', 'ARCHIDONA', 'CARLOS JULIO AROSEMENA TOLA', 'EL CHACO', 'QUIJOS'] },
  { cod: '16', nombre: 'PASTAZA', cantones: ['PASTAZA', 'ARAJUNO', 'MERA', 'SANTA CLARA'] },
  { cod: '17', nombre: 'PICHINCHA', cantones: ['QUITO', 'CAYAMBE', 'MEJÍA', 'PEDRO MONCAYO', 'PEDRO VICENTE MALDONADO', 'PUERTO QUITO', 'RUMIÑAHUI', 'SAN MIGUEL DE LOS BANCOS'] },
  { cod: '18', nombre: 'TUNGURAHUA', cantones: ['AMBATO', 'BAÑOS DE AGUA SANTA', 'CEVALLOS', 'MOCHA', 'PATATE', 'PELILEO', 'PÍLLARO', 'QUERO', 'TISALEO'] },
  { cod: '19', nombre: 'ZAMORA CHINCHIPE', cantones: ['ZAMORA', 'CENTINELA DEL CÓNDOR', 'CHINCHIPE', 'EL PANGUI', 'NANGARITZA', 'PALANDA', 'PAQUISHA', 'YACUAMBI', 'YANTZAZA'] },
  { cod: '20', nombre: 'GALÁPAGOS', cantones: ['SAN CRISTÓBAL', 'ISABELA', 'SANTA CRUZ'] },
  { cod: '21', nombre: 'SUCUMBÍOS', cantones: ['LAGO AGRIO', 'CASCALES', 'CUYABENO', 'GONZALO PIZARRO', 'PUTUMAYO', 'SHUSHUFINDI', 'SUCUMBÍOS'] },
  { cod: '22', nombre: 'ORELLANA', cantones: ['FRANCISCO DE ORELLANA', 'AGUARICO', 'LA JOYA DE LOS SACHAS', 'LORETO'] },
  { cod: '23', nombre: 'SANTO DOMINGO DE LOS TSÁCHILAS', cantones: ['SANTO DOMINGO', 'LA CONCORDIA'] },
  { cod: '24', nombre: 'SANTA ELENA', cantones: ['SANTA ELENA', 'LA LIBERTAD', 'SALINAS'] },
];

export function cantonesDe(provincia: string | null | undefined): string[] {
  return PROVINCIAS.find((p) => p.nombre === provincia)?.cantones ?? [];
}

/** Dirección corta cuando el cliente no da calle: «QUITO, PICHINCHA» o solo la provincia */
export function direccionDeUbicacion(ciudad: string | null | undefined, provincia: string | null | undefined): string | null {
  return [ciudad, provincia].filter(Boolean).join(', ') || null;
}
