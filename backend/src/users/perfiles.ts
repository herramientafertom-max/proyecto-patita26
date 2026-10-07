export const PERFILES_VALIDOS = [
  'Administrador',
  'Supervisor',
  'Reponedor',
  'Reponedor Externo',
] as const;

export type Perfil = (typeof PERFILES_VALIDOS)[number];

export const ESTADOS_VALIDOS = ['Activo', 'Inactivo'] as const;
export type EstadoUsuario = (typeof ESTADOS_VALIDOS)[number];
