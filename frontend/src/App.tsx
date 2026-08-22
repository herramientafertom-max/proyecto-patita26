import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, Product, Store } from './api';

function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const result = await api.demoLogin(password);
      localStorage.setItem('retail_token', result.accessToken); onLogin();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error de acceso'); }
    finally { setLoading(false); }
  }
  return <main className="login-page">
    <section className="login-card" aria-labelledby="login-title">
      <div className="brand-mark">R</div>
      <p className="eyebrow">Plataforma de operaciones</p>
      <h1 id="login-title">Retail en terreno</h1>
      <p className="intro">Acceso de demostración local. Las cuentas productivas todavía no están habilitadas.</p>
      <form onSubmit={submit}>
        <label htmlFor="password">Clave de demostración</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </section>
  </main>;
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [store, setStore] = useState<Store | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [storeSearch, setStoreSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const me = useQuery({ queryKey: ['me'], queryFn: api.me });
  const stores = useQuery({ queryKey: ['stores', storeSearch], queryFn: () => api.stores(storeSearch) });
  const products = useQuery({ queryKey: ['products', store?.id, productSearch], queryFn: () => api.products(store!.id, productSearch), enabled: Boolean(store) });
  const history = useQuery({ queryKey: ['history', store?.id, product?.id], queryFn: () => api.history(store!.id, product!.id), enabled: Boolean(store && product) });
  return <div className="app-shell">
    <header className="topbar"><div><span className="logo-small">R</span><strong>Retail Operaciones</strong></div><button className="link-button" onClick={onLogout}>Salir</button></header>
    <main className="content">
      <section className="welcome"><p className="eyebrow">Panel operativo</p><h1>Hola, {me.data?.name ?? 'usuario'}</h1><p>{me.data?.role ?? 'Cargando perfil…'}</p></section>
      <div className="workspace">
        <section className="panel stores-panel"><h2>Locales</h2><input aria-label="Buscar local" placeholder="Buscar local o cadena" value={storeSearch} onChange={(e) => setStoreSearch(e.target.value)} />
          {stores.isLoading && <p>Cargando locales…</p>}{stores.error && <p className="error">{stores.error.message}</p>}
          <div className="store-list">{stores.data?.items.map((item) => <button key={item.id} className={store?.id === item.id ? 'store active' : 'store'} onClick={() => { setStore(item); setProduct(null); }}><strong>{item.name}</strong><span>{item.chain} · {item.subchain}</span></button>)}</div>
        </section>
        <section className="panel products-panel"><div className="panel-heading"><div><h2>{store ? `Productos · ${store.name}` : 'Productos'}</h2><p>{store ? 'Stock vigente del local' : 'Selecciona un local para comenzar'}</p></div>{store && <input aria-label="Buscar producto" placeholder="SAP, producto o marca" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />}</div>
          {products.isLoading && <p>Cargando productos…</p>}{products.error && <p className="error">{products.error.message}</p>}
          <div className="product-grid">{products.data?.items.map((item) => <button type="button" className="product-card" key={item.id} onClick={() => setProduct(item)}><div><span className="sap">SAP {item.sap}</span><h3>{item.name}</h3><p>{item.brand ?? 'Sin marca'}</p></div><div className="metrics"><span>Stock<strong>{item.stock}</strong></span><span>Precio<strong>{item.price ? `$${Number(item.price).toLocaleString('es-CL')}` : '—'}</strong></span></div></button>)}</div>
          {product && <section className="history" aria-live="polite"><div className="history-heading"><div><p className="eyebrow">Últimos 30 días</p><h3>{product.name}</h3></div><button type="button" className="link-button" onClick={() => setProduct(null)}>Cerrar</button></div>{history.isLoading && <p>Cargando historial…</p>}{history.error && <p className="error">{history.error.message}</p>}<div className="history-list">{history.data?.items.slice(0, 20).map((item, index) => <div key={`${item.date}-${index}`}><span>{new Date(item.date).toLocaleDateString('es-CL')}</span><strong>{item.stock} unidades</strong></div>)}</div>{history.data?.items.length === 0 && <p>No hay historial reciente para este producto.</p>}</section>}
        </section>
      </div>
    </main>
  </div>;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(localStorage.getItem('retail_token')));
  const logout = () => { localStorage.removeItem('retail_token'); setAuthenticated(false); };
  return authenticated ? <Dashboard onLogout={logout} /> : <Login onLogin={() => setAuthenticated(true)} />;
}
