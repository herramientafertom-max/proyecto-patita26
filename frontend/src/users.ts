import { request } from './api';

export const USER_ROLES = ['Administrador', 'Supervisor', 'Reponedor', 'Reponedor Externo'] as const;
export const WEEK_DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export type AssignmentDays = Record<WeekDay, boolean>;
export type UserAssignment = {
  localId: string;
  codigoLocal?: string;
  nombreLocal?: string;
  dias: AssignmentDays;
};
export type ManagedUser = {
  id: string;
  rut: string;
  nombre: string;
  telefono: string | null;
  perfil: string;
  estado: string;
  authUserId: string | null;
  creadoEn: string;
  actualizadoEn: string;
  asignaciones?: UserAssignment[];
};
export type UserInput = {
  rut: string;
  nombre: string;
  telefono?: string;
  perfil: string;
  estado?: string;
  authUserId?: string | null;
  asignaciones: UserAssignment[];
};
export type AssignmentStore = {
  id: string;
  codigo: string;
  nombre: string;
  cadena: string;
  subcadena: string;
};

function listQuery(search: string, perfil: string, estado: string): string {
  const params = new URLSearchParams({ page: '1', limit: '100' });
  if (search) params.set('search', search);
  if (perfil) params.set('perfil', perfil);
  if (estado) params.set('estado', estado);
  return params.toString();
}

export const usersApi = {
  list: (search = '', perfil = '', estado = '') =>
    request<{ items: ManagedUser[]; total: number }>(`/api/v1/users?${listQuery(search, perfil, estado)}`),
  detail: (id: string) => request<ManagedUser>(`/api/v1/users/${id}`),
  options: () => request<{ locales: AssignmentStore[] }>('/api/v1/users/options'),
  create: (input: UserInput) =>
    request<ManagedUser>('/api/v1/users', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: Partial<UserInput>) =>
    request<ManagedUser>(`/api/v1/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
};
