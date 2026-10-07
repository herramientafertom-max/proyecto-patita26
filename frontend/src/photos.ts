import { request } from './api';

export type FieldPhoto = {
  id: string;
  fecha: string;
  stockAlMomento: string | null;
  fechaStockSistemico: string | null;
  usuarioNombre: string;
  url: string | null;
  referenciaArchivo: string | null;
};

export const photosApi = {
  field: (localId: string, productId: string) =>
    request<{ items: FieldPhoto[]; days: number }>(`/api/v1/photos/field?localId=${localId}&productId=${productId}&days=15`),
  uploadField: (localId: string, productId: string, photo: File, stock?: string, stockDate?: string) => {
    const form = new FormData();
    form.set('localId', localId);
    form.set('productId', productId);
    form.set('photo', photo);
    if (stock) form.set('stockAlMomento', stock);
    if (stockDate) form.set('fechaStockSistemico', stockDate);
    return request<FieldPhoto>('/api/v1/photos/field', { method: 'POST', body: form });
  },
  uploadCatalog: (productId: string, type: 'unidad' | 'pack' | 'caja', photo: File) => {
    const form = new FormData();
    form.set('photo', photo);
    return request<{ tipo: string; referenciaArchivo: string; url: string | null }>(`/api/v1/photos/catalog/${productId}/${type}`, { method: 'POST', body: form });
  },
  catalog: (productId: string) => request<{ items: Array<{ tipo: string; referenciaArchivo: string | null; url: string | null }> }>(`/api/v1/photos/catalog/${productId}`),
};
