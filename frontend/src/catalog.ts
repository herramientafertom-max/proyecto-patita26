import { request } from './api';

export type CatalogProduct = {
  id: string;
  cadenaId: string;
  cadenaNombre: string;
  sap: string;
  sapPack: string | null;
  nombreCadena: string | null;
  marcaTextoCadena: string | null;
  eanUnidad: string | null;
  eanPack: string | null;
  unidadesPorCaja: string | null;
  nombreHomologado: string | null;
  marcaNombre: string | null;
  seccionId: string | null;
  seccionNombre: string | null;
  precio: string | null;
  precioPack: string | null;
  estado: string;
  campanaActiva: boolean;
  campanaDesde: string | null;
  campanaHasta: string | null;
  quiebreActivo: boolean;
  quiebreDeclaradoEn: string | null;
};

export type CatalogProductDetail = CatalogProduct & {
  imagenes: Array<{ tipo: string; referenciaArchivo: string | null; url: string | null }>;
};

export type CatalogOptions = {
  cadenas: Array<{ id: string; nombre: string }>;
  secciones: Array<{ id: string; nombre: string }>;
  marcas: Array<{ id: string; nombre: string; proveedorId: string; proveedorNombre: string }>;
};

export type CatalogFilters = {
  search?: string;
  cadenaId?: string;
  seccionId?: string;
  estado?: string;
  campanaActiva?: boolean;
  quiebreActivo?: boolean;
  page?: number;
  limit?: number;
};

export type ProductFormInput = {
  cadenaId: string;
  sap: string;
  sapPack?: string;
  eanUnidad?: string;
  eanPack?: string;
  unidadesPorCaja?: number;
  nombreCadena?: string;
  marcaTextoCadena?: string;
  nombreHomologado: string;
  marcaId?: string;
  marcaNombre?: string;
  proveedorId?: string;
  proveedorNombre?: string;
  seccionId?: string;
  seccionNombre?: string;
  precio?: number;
  precioPack?: number;
  estado?: string;
  campanaActiva?: boolean;
  campanaDesde?: string;
  campanaHasta?: string;
};

export type CloneInput = {
  sap: string;
  sapPack?: string;
  cadenaId?: string;
  copiarEan?: boolean;
  copiarCampana?: boolean;
  copiarImagenes?: boolean;
};

function buildQuery(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.cadenaId) params.set('cadenaId', filters.cadenaId);
  if (filters.seccionId) params.set('seccionId', filters.seccionId);
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.campanaActiva !== undefined) params.set('campanaActiva', String(filters.campanaActiva));
  if (filters.quiebreActivo !== undefined) params.set('quiebreActivo', String(filters.quiebreActivo));
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 20));
  return params.toString();
}

export const catalogApi = {
  list: (filters: CatalogFilters) =>
    request<{ items: CatalogProduct[]; total: number; page: number; limit: number }>(
      `/api/v1/products?${buildQuery(filters)}`,
    ),
  options: () => request<CatalogOptions>('/api/v1/products/options'),
  detail: (id: string) => request<CatalogProductDetail>(`/api/v1/products/${id}`),
  create: (input: ProductFormInput) =>
    request<CatalogProductDetail>('/api/v1/products', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: Partial<ProductFormInput>) =>
    request<CatalogProductDetail>(`/api/v1/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  setStatus: (id: string, estado: string) =>
    request<CatalogProductDetail>(`/api/v1/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    }),
  setQuiebre: (
    id: string,
    input: { quiebreActivo: boolean; motivo?: string; propagarPorEan?: boolean },
  ) =>
    request<CatalogProductDetail>(`/api/v1/products/${id}/quiebre`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  clone: (id: string, input: CloneInput) =>
    request<CatalogProductDetail>(`/api/v1/products/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
