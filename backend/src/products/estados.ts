export const ESTADOS_PRODUCTO_VALIDOS = ['Activo', 'Bloqueado'] as const;
export type EstadoProducto = (typeof ESTADOS_PRODUCTO_VALIDOS)[number];
