import { FormEvent, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Product, RouteStore, setAccessToken, setUnauthorizedHandler, Store } from './api';
import CatalogAdmin from './CatalogAdmin';
import UsersAdmin from './UsersAdmin';
import FieldPhotos from './FieldPhotos';
import { signInWithPassword, signOut, supabase } from './auth';

function AccountLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      onLogin(await signInWithPassword(email, password));
    } catch (err) { setError(err instanceof Error ? err.message : 'Error de acceso'); }
    finally { setLoading(false); }
  }
  return <main className="login-page">
    <section className="login-card" aria-labelledby="login-title">
      <div className="brand-mark">R</div>
      <p className="eyebrow">Plataforma de operaciones</p>
      <h1 id="login-title">Retail en terreno</h1>
      <p className="intro">Ingresa con tu cuenta corporativa.</p>
      <form onSubmit={submit}>
        <label htmlFor="email">Correo</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        <label htmlFor="password">Contraseña</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </section>
  </main>;
}

function DemoLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Administrador');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const result = await api.demoLogin(password, role);
      onLogin(result.accessToken);
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
        <label htmlFor="demo-role">Perfil para pruebas locales</label>
        <select id="demo-role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option>Administrador</option><option>Supervisor</option><option>Reponedor</option><option>Reponedor Externo</option>
        </select>
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </section>
  </main>;
}

const DAY_LABELS: Record<keyof RouteStore['days'], string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mie', jueves: 'Jue', viernes: 'Vie', sabado: 'Sab', domingo: 'Dom',
};

function Operacion({ worker }: { worker: boolean }) {
  const [store, setStore] = useState<Store | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [storeSearch, setStoreSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const stores = useQuery({ queryKey: ['stores', storeSearch], queryFn: () => api.stores(storeSearch), enabled: !worker });
  const products = useQuery({ queryKey: ['products', store?.id, productSearch], queryFn: () => api.products(store!.id, productSearch), enabled: Boolean(store) });
  const history = useQuery({ queryKey: ['history', store?.id, product?.id], queryFn: () => api.history(store!.id, product!.id), enabled: Boolean(store && product) });
  const route = useQuery({ queryKey: ['my-route'], queryFn: api.myRoute, enabled: worker });
  return <div className="workspace">
    <section className="panel stores-panel">
      <h2>{worker ? 'Mi jornada' : 'Locales'}</h2>
      {worker && <><p className="field-hint">Estos son tus locales asignados. Elige uno para revisar productos y registrar evidencia.</p>
        {route.isLoading && <p>Cargando ruta semanal…</p>}
        {route.error && <p className="error">{route.error.message}</p>}
        <div className="route-list">{route.data?.items.filter((item) => `${item.name} ${item.chain} ${item.subchain}`.toLowerCase().includes(storeSearch.trim().toLowerCase())).map((item) => <RouteCard key={item.id} store={item} active={store?.id === item.id} onSelect={() => { setStore(item); setProduct(null); }} />)}</div>
        {route.data?.items.length === 0 && <p>No tienes locales asignados todavía. Contacta a tu supervisor.</p>}
      </>}
      <input aria-label="Buscar local" placeholder="Buscar local o cadena" value={storeSearch} onChange={(e) => setStoreSearch(e.target.value)} />
      {!worker && <>{stores.isLoading && <p>Cargando locales…</p>}{stores.error && <p className="error">{stores.error.message}</p>}
        <div className="store-list">{stores.data?.items.map((item) => <button key={item.id} className={store?.id === item.id ? 'store active' : 'store'} onClick={() => { setStore(item); setProduct(null); }}><strong>{item.name}</strong><span>{item.chain} · {item.subchain}</span></button>)}</div>
      </>}
    </section>
    <section className="panel products-panel"><div className="panel-heading"><div><h2>{store ? `Productos · ${store.name}` : 'Productos'}</h2><p>{store ? 'Stock vigente del local' : 'Selecciona un local para comenzar'}</p></div>{store && <input aria-label="Buscar producto" placeholder="SAP, producto o marca" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />}</div>
      {products.isLoading && <p>Cargando productos…</p>}{products.error && <p className="error">{products.error.message}</p>}
      <div className="product-grid">{products.data?.items.map((item) => <button type="button" className="product-card" key={item.id} onClick={() => setProduct(item)}><div><span className="sap">SAP {item.sap}</span><h3>{item.name}</h3><p>{item.brand ?? 'Sin marca'}</p></div><div className="metrics"><span>Stock<strong>{item.stock}</strong></span><span>Precio<strong>{item.price ? `$${Number(item.price).toLocaleString('es-CL')}` : '—'}</strong></span></div></button>)}</div>
      {product && <section className="history" aria-live="polite"><div className="history-heading"><div><p className="eyebrow">Últimos 30 días</p><h3>{product.name}</h3></div><button type="button" className="link-button" onClick={() => setProduct(null)}>Cerrar</button></div>{history.isLoading && <p>Cargando historial…</p>}{history.error && <p className="error">{history.error.message}</p>}<div className="history-list">{history.data?.items.slice(0, 20).map((item, index) => <div key={`${item.date}-${index}`}><span>{new Date(item.date).toLocaleDateString('es-CL')}</span><strong>{item.stock} unidades</strong></div>)}</div>{history.data?.items.length === 0 && <p>No hay historial reciente para este producto.</p>}<FieldPhotos store={store!} product={product} /></section>}
    </section>
  </div>;
}

function RouteCard({ store, active, onSelect }: { store: RouteStore; active: boolean; onSelect: () => void }) {
  return <button type="button" className={active ? 'route-card active' : 'route-card'} onClick={onSelect}>
    <strong>{store.name}</strong><span>{store.chain} · {store.subchain}</span>
    <div className="route-days" aria-label={`Días asignados para ${store.name}`}>{Object.entries(store.days).map(([day, assigned]) => <span className={assigned ? 'assigned' : ''} key={day}>{DAY_LABELS[day as keyof RouteStore['days']]}</span>)}</div>
  </button>;
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [view, setView] = useState<'operacion' | 'catalogo' | 'usuarios'>('operacion');
  const me = useQuery({ queryKey: ['me'], queryFn: api.me });
  const puedeAdministrarCatalogo = me.data?.role === 'Administrador' || me.data?.role === 'Supervisor';
  if (me.isLoading) return <main className="login-page"><p>Cargando sesión…</p></main>;
  if (me.error) return <main className="login-page"><p className="error">{me.error.message}</p><button onClick={() => void me.refetch()}>Reintentar</button></main>;
  return <div className="app-shell">
    <header className="topbar"><div><span className="logo-small">R</span><strong>Retail Operaciones</strong></div><button className="link-button" onClick={onLogout}>Salir</button></header>
    <main className="content">
      <section className="welcome"><p className="eyebrow">Panel operativo</p><h1>Hola, {me.data?.name ?? 'usuario'}</h1><p>{me.data?.role ?? 'Cargando perfil…'}</p></section>
      {puedeAdministrarCatalogo && (
        <nav className="view-tabs" aria-label="Secciones">
          <button type="button" className={view === 'operacion' ? 'tab active' : 'tab'} aria-current={view === 'operacion'} onClick={() => setView('operacion')}>Operación</button>
          <button type="button" className={view === 'catalogo' ? 'tab active' : 'tab'} aria-current={view === 'catalogo'} onClick={() => setView('catalogo')}>Catálogo</button>
          {me.data?.role === 'Administrador' && <button type="button" className={view === 'usuarios' ? 'tab active' : 'tab'} aria-current={view === 'usuarios'} onClick={() => setView('usuarios')}>Usuarios</button>}
        </nav>
      )}
      {view === 'catalogo' && puedeAdministrarCatalogo
        ? <CatalogAdmin role={me.data!.role} />
        : view === 'usuarios' && me.data?.role === 'Administrador'
          ? <UsersAdmin />
          : <Operacion worker={!puedeAdministrarCatalogo} />}
    </main>
  </div>;
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const logout = () => {
    void signOut();
    setAccessToken(null);
    queryClient.clear();
    setToken(null);
  };
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
      setAccessToken(null);
      queryClient.clear();
      setToken(null);
    });
    return () => setUnauthorizedHandler(null);
  }, [queryClient]);
  useEffect(() => {
    if (!supabase) return;
    // Restaura la sesión persistida y mantiene el token vigente tras cada renovación.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextToken = session?.access_token ?? null;
      setAccessToken(nextToken);
      setToken(nextToken);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const login = (nextToken: string) => {
    setAccessToken(nextToken);
    setToken(nextToken);
  };
  if (token) return <Dashboard onLogout={logout} />;
  return supabase ? <AccountLogin onLogin={login} /> : <DemoLogin onLogin={login} />;
}
