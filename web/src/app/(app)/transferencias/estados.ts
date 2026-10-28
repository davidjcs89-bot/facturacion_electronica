export const TRANSF = { PENDIENTE: 1, FINALIZADO: 2, ANULADO: 3 } as const;
export const NOMBRE_TRANSF: Record<number, [string, string]> = { 1: ['Pendiente', 'e1'], 2: ['Finalizada', 'e6'], 3: ['Anulada', 'e8'] };
