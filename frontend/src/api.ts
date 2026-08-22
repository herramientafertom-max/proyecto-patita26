export type User = { id: string; name: string; role: string; tenantId: string };
export type Store = { id: string; code: string; name: string; chain: string; subchain: string; status: string };
export type Product = { id: string; sap: string; name: string; brand: string | null; price: string | null; stock: string; stockDate: string };
export type StockHistory = { date: string; stock: string };

const API_URL = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('retail_token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? 'No fue posible completar la solicitud');
  }
  return response.json() as Promise<T>;
}

export const api = {
  demoLogin: (password: string) => request<{ accessToken: string; user: User }>('/api/v1/auth/demo', { method: 'POST', body: JSON.stringify({ password }) }),
  me: () => request<User>('/api/v1/auth/me'),
  stores: (search = '') => request<{ items: Store[]; total: number }>(`/api/v1/stores?limit=100&search=${encodeURIComponent(search)}`),
  products: (storeId: string, search = '') => request<{ items: Product[]; total: number }>(`/api/v1/stores/${storeId}/products?limit=50&search=${encodeURIComponent(search)}`),
  history: (storeId: string, productId: string) => request<{ items: StockHistory[] }>(`/api/v1/stores/${storeId}/products/${productId}/history?days=30`),
};
