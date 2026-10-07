export type User = { id: string; name: string; role: string; tenantId: string };
export type Store = { id: string; code: string; name: string; chain: string; subchain: string; status: string };
export type Product = { id: string; sap: string; name: string; brand: string | null; price: string | null; stock: string; stockDate: string };
export type StockHistory = { date: string; stock: string };
export type RouteStore = Store & {
  days: Record<'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo', boolean>;
};

const API_URL = import.meta.env.VITE_API_URL ?? '';
let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export class UnauthorizedError extends Error {}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...(!isFormData ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
    if (response.status === 401) {
      accessToken = null;
      onUnauthorized?.();
      throw new UnauthorizedError(message ?? 'Tu sesión expiró.');
    }
    throw new Error(message ?? 'No fue posible completar la solicitud');
  }
  return response.json() as Promise<T>;
}

export const api = {
  demoLogin: (password: string, role: string) => request<{ accessToken: string; user: User }>('/api/v1/auth/demo', { method: 'POST', body: JSON.stringify({ password, role }) }),
  me: () => request<User>('/api/v1/auth/me'),
  myRoute: () => request<{ items: RouteStore[] }>('/api/v1/stores/my-route'),
  stores: (search = '') => request<{ items: Store[]; total: number }>(`/api/v1/stores?limit=100&search=${encodeURIComponent(search)}`),
  products: (storeId: string, search = '') => request<{ items: Product[]; total: number }>(`/api/v1/stores/${storeId}/products?limit=50&search=${encodeURIComponent(search)}`),
  history: (storeId: string, productId: string) => request<{ items: StockHistory[] }>(`/api/v1/stores/${storeId}/products/${productId}/history?days=30`),
};
