import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AssignmentDays,
  AssignmentStore,
  ManagedUser,
  USER_ROLES,
  UserAssignment,
  UserInput,
  WEEK_DAYS,
  usersApi,
} from './users';

const DAY_LABELS: Record<string, string> = {
  lunes: 'L', martes: 'M', miercoles: 'X', jueves: 'J', viernes: 'V', sabado: 'S', domingo: 'D',
};
const emptyDays = (): AssignmentDays => ({
  lunes: false, martes: false, miercoles: false, jueves: false, viernes: false, sabado: false, domingo: false,
});

function UserForm({
  user,
  stores,
  saving,
  serverError,
  onSave,
  onCancel,
}: {
  user: ManagedUser | null;
  stores: AssignmentStore[];
  saving: boolean;
  serverError: string | null;
  onSave: (input: UserInput) => void;
  onCancel: () => void;
}) {
  const [rut, setRut] = useState(user?.rut ?? '');
  const [nombre, setNombre] = useState(user?.nombre ?? '');
  const [telefono, setTelefono] = useState(user?.telefono ?? '');
  const [perfil, setPerfil] = useState(user?.perfil ?? 'Reponedor');
  const [estado, setEstado] = useState(user?.estado ?? 'Activo');
  const [assignments, setAssignments] = useState<Record<string, AssignmentDays>>(() =>
    Object.fromEntries((user?.asignaciones ?? []).map((item) => [item.localId, { ...item.dias }])),
  );
  const [storeSearch, setStoreSearch] = useState('');
  const [formError, setFormError] = useState('');
  const visibleStores = useMemo(() => {
    const needle = storeSearch.trim().toLowerCase();
    if (!needle) return stores;
    return stores.filter((store) => `${store.codigo} ${store.nombre} ${store.cadena} ${store.subcadena}`.toLowerCase().includes(needle));
  }, [storeSearch, stores]);

  function toggleStore(localId: string) {
    setAssignments((current) => {
      const next = { ...current };
      if (next[localId]) delete next[localId];
      else next[localId] = emptyDays();
      return next;
    });
  }

  function toggleDay(localId: string, day: keyof AssignmentDays) {
    setAssignments((current) => ({
      ...current,
      [localId]: { ...current[localId], [day]: !current[localId][day] },
    }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    if (!rut.trim() || !nombre.trim()) return setFormError('RUT y nombre son obligatorios.');
    const asignaciones: UserAssignment[] = Object.entries(assignments).map(([localId, dias]) => ({ localId, dias }));
    const input: UserInput = {
      rut: rut.trim(),
      nombre: nombre.trim(),
      telefono: telefono.trim() || undefined,
      perfil,
      asignaciones,
    };
    if (user) input.estado = estado;
    onSave(input);
  }

  return (
    <section className="panel form-panel user-form" aria-labelledby="user-form-title">
      <h2 id="user-form-title">{user ? `Editar a ${user.nombre}` : 'Nuevo usuario'}</h2>
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <div className="field"><label htmlFor="uf-rut">RUT *</label><input id="uf-rut" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="12.345.678-5" /></div>
          <div className="field"><label htmlFor="uf-nombre">Nombre *</label><input id="uf-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
          <div className="field"><label htmlFor="uf-telefono">Teléfono</label><input id="uf-telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></div>
          <div className="field"><label htmlFor="uf-perfil">Perfil</label><select id="uf-perfil" value={perfil} onChange={(e) => setPerfil(e.target.value)}>{USER_ROLES.map((role) => <option key={role}>{role}</option>)}</select></div>
          {user && <div className="field"><label htmlFor="uf-estado">Estado</label><select id="uf-estado" value={estado} onChange={(e) => setEstado(e.target.value)}><option>Activo</option><option>Inactivo</option></select></div>}
        </div>
        <fieldset className="assignment-fieldset">
          <legend>Locales y días asignados</legend>
          <input aria-label="Buscar local para asignar" placeholder="Buscar local, cadena o código" value={storeSearch} onChange={(e) => setStoreSearch(e.target.value)} />
          <div className="assignment-list">
            {visibleStores.map((store) => {
              const days = assignments[store.id];
              return <div className={days ? 'assignment-row selected' : 'assignment-row'} key={store.id}>
                <label className="assignment-store"><input type="checkbox" checked={Boolean(days)} onChange={() => toggleStore(store.id)} /><span><strong>{store.nombre}</strong><small>{store.cadena} · {store.subcadena} · {store.codigo}</small></span></label>
                {days && <div className="day-picker" aria-label={`Días para ${store.nombre}`}>{WEEK_DAYS.map((day) => <label key={day} title={day}><input type="checkbox" checked={days[day]} onChange={() => toggleDay(store.id, day)} /><span>{DAY_LABELS[day]}</span></label>)}</div>}
              </div>;
            })}
          </div>
          {visibleStores.length === 0 && <p>No se encontraron locales.</p>}
        </fieldset>
        {(formError || serverError) && <p className="error" role="alert">{formError || serverError}</p>}
        <div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button><button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar usuario'}</button></div>
      </form>
    </section>
  );
}

export default function UsersAdmin() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [perfil, setPerfil] = useState('');
  const [estado, setEstado] = useState('');
  const [editing, setEditing] = useState<ManagedUser | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const list = useQuery({ queryKey: ['managed-users', search, perfil, estado], queryFn: () => usersApi.list(search, perfil, estado) });
  const options = useQuery({ queryKey: ['user-options'], queryFn: usersApi.options });
  const detail = useMutation({
    mutationFn: usersApi.detail,
    onSuccess: (user) => setEditing(user),
    onError: (err: Error) => setError(err.message),
  });
  const save = useMutation({
    mutationFn: (input: UserInput) => editing ? usersApi.update(editing.id, input) : usersApi.create(input),
    onSuccess: () => { setEditing(undefined); setError(null); void queryClient.invalidateQueries({ queryKey: ['managed-users'] }); },
    onError: (err: Error) => setError(err.message),
  });

  useEffect(() => setError(null), [editing]);

  if (editing !== undefined) return <UserForm user={editing} stores={options.data?.locales ?? []} saving={save.isPending} serverError={error} onSave={(input) => save.mutate(input)} onCancel={() => setEditing(undefined)} />;

  return <section className="users-admin" aria-labelledby="users-title">
    <div className="panel-heading"><div><h2 id="users-title">Usuarios y reponedores</h2><p>Administra perfiles, estado y rutas semanales por local.</p></div><button type="button" onClick={() => setEditing(null)}>+ Nuevo usuario</button></div>
    <div className="user-filters"><div className="field"><label htmlFor="users-search">Buscar</label><input id="users-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre o RUT" /></div><div className="field"><label htmlFor="users-profile">Perfil</label><select id="users-profile" value={perfil} onChange={(e) => setPerfil(e.target.value)}><option value="">Todos</option>{USER_ROLES.map((role) => <option key={role}>{role}</option>)}</select></div><div className="field"><label htmlFor="users-status">Estado</label><select id="users-status" value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todos</option><option>Activo</option><option>Inactivo</option></select></div></div>
    {(list.error || options.error || error) && <p className="error" role="alert">{list.error?.message || options.error?.message || error}</p>}
    {list.isLoading && <p>Cargando usuarios…</p>}
    <div className="user-list">{list.data?.items.map((user) => <article className="user-row" key={user.id}><div><h3>{user.nombre}</h3><p>{user.rut}{user.telefono ? ` · ${user.telefono}` : ''}</p></div><div className="badge-row"><span className="badge badge-info">{user.perfil}</span><span className={user.estado === 'Activo' ? 'badge badge-ok' : 'badge badge-off'}>{user.estado}</span>{user.authUserId ? <span className="badge badge-ok">Acceso vinculado</span> : <span className="badge badge-neutral">Sin cuenta de acceso</span>}</div><button type="button" className="secondary-button" disabled={detail.isPending} onClick={() => detail.mutate(user.id)}>Editar y asignar</button></article>)}</div>
    {list.data?.items.length === 0 && <p>No hay usuarios para estos filtros.</p>}
  </section>;
}
