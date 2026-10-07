import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CatalogFilters,
  CatalogOptions,
  CatalogProduct,
  CatalogProductDetail,
  CloneInput,
  ProductFormInput,
  catalogApi,
} from './catalog';
import CatalogPhotos from './CatalogPhotos';

type Role = 'Administrador' | 'Supervisor' | 'Reponedor' | 'Reponedor Externo' | string;

const PAGE_SIZE = 20;

function money(value: string | null): string {
  if (!value) return '—';
  return `$${Number(value).toLocaleString('es-CL')}`;
}

function EstadoBadge({ estado }: { estado: string }) {
  const activo = estado === 'Activo';
  return (
    <span className={activo ? 'badge badge-ok' : 'badge badge-off'}>
      {activo ? 'Activo' : 'Bloqueado'}
    </span>
  );
}

function QuiebreBadge({ activo }: { activo: boolean }) {
  if (!activo) return <span className="badge badge-neutral">Sin quiebre</span>;
  return <span className="badge badge-warn">Quiebre declarado</span>;
}

function CampanaBadge({ activa, desde, hasta }: { activa: boolean; desde: string | null; hasta: string | null }) {
  if (!activa) return <span className="badge badge-neutral">Sin campaña</span>;
  const rango = [desde, hasta].filter(Boolean).join(' – ');
  return <span className="badge badge-info">Campaña activa{rango ? ` (${rango})` : ''}</span>;
}

type ProductFormProps = {
  title: string;
  options: CatalogOptions;
  initial?: Partial<ProductFormInput>;
  allowEstadoInicial?: boolean;
  submitLabel: string;
  submitting: boolean;
  serverError: string | null;
  onSubmit: (input: ProductFormInput) => void;
  onCancel: () => void;
};

function ProductForm({
  title,
  options,
  initial,
  allowEstadoInicial,
  submitLabel,
  submitting,
  serverError,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const [cadenaId, setCadenaId] = useState(initial?.cadenaId ?? '');
  const [sap, setSap] = useState(initial?.sap ?? '');
  const [sapPack, setSapPack] = useState(initial?.sapPack ?? '');
  const [eanUnidad, setEanUnidad] = useState(initial?.eanUnidad ?? '');
  const [eanPack, setEanPack] = useState(initial?.eanPack ?? '');
  const [unidadesPorCaja, setUnidadesPorCaja] = useState(
    initial?.unidadesPorCaja !== undefined ? String(initial.unidadesPorCaja) : '',
  );
  const [nombreCadena, setNombreCadena] = useState(initial?.nombreCadena ?? '');
  const [marcaTextoCadena, setMarcaTextoCadena] = useState(initial?.marcaTextoCadena ?? '');
  const [nombreHomologado, setNombreHomologado] = useState(initial?.nombreHomologado ?? '');
  const [marcaNombre, setMarcaNombre] = useState(initial?.marcaNombre ?? '');
  const [proveedorNombre, setProveedorNombre] = useState(initial?.proveedorNombre ?? '');
  const [seccionNombre, setSeccionNombre] = useState(initial?.seccionNombre ?? '');
  const [precio, setPrecio] = useState(initial?.precio !== undefined ? String(initial.precio) : '');
  const [precioPack, setPrecioPack] = useState(
    initial?.precioPack !== undefined ? String(initial.precioPack) : '',
  );
  const [estado, setEstado] = useState(initial?.estado ?? 'Activo');
  const [campanaActiva, setCampanaActiva] = useState(initial?.campanaActiva ?? false);
  const [campanaDesde, setCampanaDesde] = useState(initial?.campanaDesde ?? '');
  const [campanaHasta, setCampanaHasta] = useState(initial?.campanaHasta ?? '');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const proveedoresSugeridos = useMemo(
    () => Array.from(new Set(options.marcas.map((m) => m.proveedorNombre))),
    [options.marcas],
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    if (!cadenaId) return setFormError('Selecciona una cadena.');
    if (!sap.trim()) return setFormError('El SAP de unidad es obligatorio.');
    if (!nombreHomologado.trim()) return setFormError('El nombre homologado es obligatorio.');
    if (campanaActiva && !campanaDesde) return setFormError('Indica la fecha de inicio de la campaña.');
    if (campanaDesde && campanaHasta && campanaHasta < campanaDesde) {
      return setFormError('La fecha de término de la campaña no puede ser anterior a la de inicio.');
    }

    const input: ProductFormInput = {
      cadenaId,
      sap: sap.trim(),
      sapPack: sapPack.trim() || undefined,
      eanUnidad: eanUnidad.trim() || undefined,
      eanPack: eanPack.trim() || undefined,
      unidadesPorCaja: unidadesPorCaja ? Number(unidadesPorCaja) : undefined,
      nombreCadena: nombreCadena.trim() || undefined,
      marcaTextoCadena: marcaTextoCadena.trim() || undefined,
      nombreHomologado: nombreHomologado.trim(),
      marcaNombre: marcaNombre.trim() || undefined,
      proveedorNombre: proveedorNombre.trim() || undefined,
      seccionNombre: seccionNombre.trim() || undefined,
      precio: precio ? Number(precio) : undefined,
      precioPack: precioPack ? Number(precioPack) : undefined,
      campanaActiva,
      campanaDesde: campanaDesde || undefined,
      campanaHasta: campanaHasta || undefined,
    };
    if (allowEstadoInicial) input.estado = estado;
    onSubmit(input);
  }

  return (
    <section className="panel form-panel" aria-labelledby="product-form-title">
      <h2 id="product-form-title">{title}</h2>
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="pf-cadena">Cadena *</label>
            <select
              id="pf-cadena"
              ref={firstFieldRef}
              value={cadenaId}
              onChange={(e) => setCadenaId(e.target.value)}
              required
            >
              <option value="">Selecciona una cadena</option>
              {options.cadenas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pf-sap">SAP de unidad *</label>
            <input id="pf-sap" value={sap} onChange={(e) => setSap(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="pf-sap-pack">SAP de pack</label>
            <input id="pf-sap-pack" value={sapPack} onChange={(e) => setSapPack(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pf-ean-unidad">EAN de unidad</label>
            <input
              id="pf-ean-unidad"
              inputMode="numeric"
              value={eanUnidad}
              onChange={(e) => setEanUnidad(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="pf-ean-pack">EAN de pack</label>
            <input
              id="pf-ean-pack"
              inputMode="numeric"
              value={eanPack}
              onChange={(e) => setEanPack(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="pf-uxc">Unidades por caja</label>
            <input
              id="pf-uxc"
              type="number"
              min={1}
              step={1}
              value={unidadesPorCaja}
              onChange={(e) => setUnidadesPorCaja(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="pf-nombre-homologado">Nombre homologado *</label>
            <input
              id="pf-nombre-homologado"
              value={nombreHomologado}
              onChange={(e) => setNombreHomologado(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pf-nombre-cadena">Nombre en la cadena</label>
            <input
              id="pf-nombre-cadena"
              value={nombreCadena}
              onChange={(e) => setNombreCadena(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="pf-marca">Marca</label>
            <input
              id="pf-marca"
              list="pf-marcas-existentes"
              value={marcaNombre}
              onChange={(e) => setMarcaNombre(e.target.value)}
            />
            <datalist id="pf-marcas-existentes">
              {options.marcas.map((m) => (
                <option key={m.id} value={m.nombre} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="pf-proveedor">Proveedor de la marca</label>
            <input
              id="pf-proveedor"
              list="pf-proveedores-existentes"
              value={proveedorNombre}
              onChange={(e) => setProveedorNombre(e.target.value)}
              aria-describedby="pf-proveedor-hint"
            />
            <datalist id="pf-proveedores-existentes">
              {proveedoresSugeridos.map((nombre) => (
                <option key={nombre} value={nombre} />
              ))}
            </datalist>
            <p id="pf-proveedor-hint" className="field-hint">
              Solo necesario si la marca es nueva.
            </p>
          </div>
          <div className="field">
            <label htmlFor="pf-marca-cadena">Marca tal como la expone la cadena</label>
            <input
              id="pf-marca-cadena"
              value={marcaTextoCadena}
              onChange={(e) => setMarcaTextoCadena(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="pf-seccion">Sección</label>
            <input
              id="pf-seccion"
              list="pf-secciones-existentes"
              value={seccionNombre}
              onChange={(e) => setSeccionNombre(e.target.value)}
            />
            <datalist id="pf-secciones-existentes">
              {options.secciones.map((s) => (
                <option key={s.id} value={s.nombre} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="pf-precio">Precio de unidad</label>
            <input
              id="pf-precio"
              type="number"
              min={0}
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="pf-precio-pack">Precio de pack</label>
            <input
              id="pf-precio-pack"
              type="number"
              min={0}
              step="0.01"
              value={precioPack}
              onChange={(e) => setPrecioPack(e.target.value)}
            />
          </div>
          {allowEstadoInicial && (
            <div className="field">
              <label htmlFor="pf-estado">Estado inicial</label>
              <select id="pf-estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="Activo">Activo</option>
                <option value="Bloqueado">Bloqueado</option>
              </select>
            </div>
          )}
        </div>

        <fieldset className="campaign-fieldset">
          <legend>Campaña comercial</legend>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={campanaActiva}
              onChange={(e) => setCampanaActiva(e.target.checked)}
            />
            Campaña activa
          </label>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="pf-campana-desde">Desde</label>
              <input
                id="pf-campana-desde"
                type="date"
                value={campanaDesde}
                onChange={(e) => setCampanaDesde(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="pf-campana-hasta">Hasta</label>
              <input
                id="pf-campana-hasta"
                type="date"
                value={campanaHasta}
                onChange={(e) => setCampanaHasta(e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        {(formError || serverError) && (
          <p className="error" role="alert">
            {formError || serverError}
          </p>
        )}

        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}

function CloneForm({
  product,
  submitting,
  serverError,
  onSubmit,
  onCancel,
}: {
  product: CatalogProduct;
  submitting: boolean;
  serverError: string | null;
  onSubmit: (input: CloneInput) => void;
  onCancel: () => void;
}) {
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [sap, setSap] = useState('');
  const [copiarEan, setCopiarEan] = useState(false);
  const [copiarCampana, setCopiarCampana] = useState(false);
  const [copiarImagenes, setCopiarImagenes] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    if (!sap.trim()) return setFormError('Indica el nuevo SAP.');
    onSubmit({ sap: sap.trim(), copiarEan, copiarCampana, copiarImagenes });
  }

  return (
    <section className="panel form-panel" aria-labelledby="clone-form-title">
      <h2 id="clone-form-title">Clonar «{product.nombreHomologado ?? product.sap}»</h2>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="cf-sap">Nuevo SAP de unidad *</label>
          <input id="cf-sap" ref={firstFieldRef} value={sap} onChange={(e) => setSap(e.target.value)} required />
        </div>
        <label className="checkbox-field">
          <input type="checkbox" checked={copiarEan} onChange={(e) => setCopiarEan(e.target.checked)} />
          Reutilizar el mismo artículo físico (EAN) del original
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={copiarCampana}
            onChange={(e) => setCopiarCampana(e.target.checked)}
          />
          Copiar la campaña activa
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={copiarImagenes}
            onChange={(e) => setCopiarImagenes(e.target.checked)}
          />
          Copiar las imágenes de catálogo
        </label>
        <p className="field-hint">El clon nunca copia stock, inventario, historial ni fotos de terreno.</p>
        {(formError || serverError) && (
          <p className="error" role="alert">
            {formError || serverError}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Clonando…' : 'Clonar producto'}
          </button>
        </div>
      </form>
    </section>
  );
}

function QuiebreForm({
  product,
  submitting,
  serverError,
  onSubmit,
  onCancel,
}: {
  product: CatalogProduct;
  submitting: boolean;
  serverError: string | null;
  onSubmit: (input: { quiebreActivo: boolean; motivo?: string; propagarPorEan?: boolean }) => void;
  onCancel: () => void;
}) {
  const activar = !product.quiebreActivo;
  const [motivo, setMotivo] = useState('');
  const [propagar, setPropagar] = useState(false);
  const eanValido = Boolean(product.eanUnidad && product.eanUnidad.replace(/\D/g, '').length >= 8);

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ quiebreActivo: activar, motivo: motivo.trim() || undefined, propagarPorEan: propagar });
  }

  return (
    <section className="panel form-panel" aria-labelledby="quiebre-form-title">
      <h2 id="quiebre-form-title">
        {activar ? 'Declarar quiebre' : 'Revertir quiebre'} — {product.nombreHomologado ?? product.sap}
      </h2>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="qf-motivo">Motivo (opcional)</label>
          <input id="qf-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={propagar}
            onChange={(e) => setPropagar(e.target.checked)}
            disabled={!eanValido}
          />
          Aplicar a todos los productos con el mismo EAN
        </label>
        {!eanValido && (
          <p className="field-hint">
            Este artículo no tiene un EAN válido (mínimo 8 dígitos), por lo que no se puede propagar.
          </p>
        )}
        {serverError && (
          <p className="error" role="alert">
            {serverError}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : activar ? 'Declarar quiebre' : 'Revertir quiebre'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function CatalogAdmin({ role }: { role: Role }) {
  const isAdmin = role === 'Administrador';
  const canWrite = isAdmin || role === 'Supervisor';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [cadenaId, setCadenaId] = useState('');
  const [seccionId, setSeccionId] = useState('');
  const [estado, setEstado] = useState('');
  const [quiebreActivo, setQuiebreActivo] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);

  const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'clone' | 'quiebre' | 'photos'>('list');
  const [selected, setSelected] = useState<CatalogProductDetail | CatalogProduct | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const filters: CatalogFilters = {
    search: search || undefined,
    cadenaId: cadenaId || undefined,
    seccionId: seccionId || undefined,
    estado: estado || undefined,
    quiebreActivo: quiebreActivo === '' ? undefined : quiebreActivo === 'true',
    page,
    limit: PAGE_SIZE,
  };

  const optionsQuery = useQuery({ queryKey: ['catalog-options'], queryFn: catalogApi.options });
  const listQuery = useQuery({
    queryKey: ['catalog-products', filters],
    queryFn: () => catalogApi.list(filters),
    enabled: Boolean(optionsQuery.data),
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['catalog-products'] });
    void queryClient.invalidateQueries({ queryKey: ['catalog-options'] });
  }

  const createMutation = useMutation({
    mutationFn: catalogApi.create,
    onSuccess: () => {
      setStatusMessage('Producto creado correctamente.');
      setMode('list');
      invalidate();
    },
    onError: (error: Error) => setActionError(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProductFormInput> }) =>
      catalogApi.update(id, input),
    onSuccess: () => {
      setStatusMessage('Producto actualizado correctamente.');
      setMode('list');
      invalidate();
    },
    onError: (error: Error) => setActionError(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nuevoEstado }: { id: string; nuevoEstado: string }) =>
      catalogApi.setStatus(id, nuevoEstado),
    onSuccess: (_data, variables) => {
      setStatusMessage(
        variables.nuevoEstado === 'Activo' ? 'Producto activado.' : 'Producto bloqueado.',
      );
      invalidate();
    },
    onError: (error: Error) => setActionError(error.message),
  });

  const cloneMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CloneInput }) => catalogApi.clone(id, input),
    onSuccess: () => {
      setStatusMessage('Producto clonado correctamente.');
      setMode('list');
      invalidate();
    },
    onError: (error: Error) => setActionError(error.message),
  });

  const quiebreMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { quiebreActivo: boolean; motivo?: string; propagarPorEan?: boolean };
    }) => catalogApi.setQuiebre(id, input),
    onSuccess: (_data, variables) => {
      setStatusMessage(
        variables.input.quiebreActivo ? 'Quiebre declarado.' : 'Quiebre revertido.',
      );
      setMode('list');
      invalidate();
    },
    onError: (error: Error) => setActionError(error.message),
  });

  function openCreate() {
    setSelected(null);
    setActionError(null);
    setMode('create');
  }

  function openEdit(product: CatalogProduct) {
    setSelected(product);
    setActionError(null);
    setMode('edit');
  }

  function openClone(product: CatalogProduct) {
    setSelected(product);
    setActionError(null);
    setMode('clone');
  }

  function openQuiebre(product: CatalogProduct) {
    setSelected(product);
    setActionError(null);
    setMode('quiebre');
  }

  function openPhotos(product: CatalogProduct) {
    setSelected(product);
    setActionError(null);
    setMode('photos');
  }

  function toggleEstado(product: CatalogProduct) {
    const nuevoEstado = product.estado === 'Activo' ? 'Bloqueado' : 'Activo';
    const confirmado = window.confirm(
      nuevoEstado === 'Activo'
        ? `¿Reactivar «${product.nombreHomologado ?? product.sap}»?`
        : `¿Bloquear «${product.nombreHomologado ?? product.sap}»? Dejará de aparecer en la operación normal.`,
    );
    if (!confirmado) return;
    setActionError(null);
    statusMutation.mutate({ id: product.id, nuevoEstado });
  }

  const options = optionsQuery.data;
  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="catalog-admin" aria-labelledby="catalog-title">
      <div className="panel-heading">
        <div>
          <h2 id="catalog-title">Catálogo de productos</h2>
          <p>Administra productos, precios, campañas y quiebres de tu empresa.</p>
        </div>
        {isAdmin && (
          <button type="button" onClick={openCreate}>
            + Nuevo producto
          </button>
        )}
      </div>

      <div aria-live="polite" className="visually-hidden">
        {statusMessage}
      </div>

      {mode === 'create' && options && (
        <ProductForm
          title="Nuevo producto"
          options={options}
          allowEstadoInicial
          submitLabel="Crear producto"
          submitting={createMutation.isPending}
          serverError={actionError}
          onSubmit={(input) => {
            setActionError(null);
            createMutation.mutate(input);
          }}
          onCancel={() => setMode('list')}
        />
      )}

      {mode === 'edit' && selected && options && (
        <ProductForm
          title={`Editar «${selected.nombreHomologado ?? selected.sap}»`}
          options={options}
          initial={{
            cadenaId: selected.cadenaId,
            sap: selected.sap,
            sapPack: selected.sapPack ?? undefined,
            eanUnidad: selected.eanUnidad ?? undefined,
            eanPack: selected.eanPack ?? undefined,
            unidadesPorCaja: selected.unidadesPorCaja ? Number(selected.unidadesPorCaja) : undefined,
            nombreCadena: selected.nombreCadena ?? undefined,
            marcaTextoCadena: selected.marcaTextoCadena ?? undefined,
            nombreHomologado: selected.nombreHomologado ?? '',
            marcaNombre: selected.marcaNombre ?? undefined,
            seccionNombre: selected.seccionNombre ?? undefined,
            precio: selected.precio ? Number(selected.precio) : undefined,
            precioPack: selected.precioPack ? Number(selected.precioPack) : undefined,
            campanaActiva: selected.campanaActiva,
            campanaDesde: selected.campanaDesde ?? undefined,
            campanaHasta: selected.campanaHasta ?? undefined,
          }}
          submitLabel="Guardar cambios"
          submitting={updateMutation.isPending}
          serverError={actionError}
          onSubmit={(input) => {
            setActionError(null);
            updateMutation.mutate({ id: selected.id, input });
          }}
          onCancel={() => setMode('list')}
        />
      )}

      {mode === 'clone' && selected && (
        <CloneForm
          product={selected}
          submitting={cloneMutation.isPending}
          serverError={actionError}
          onSubmit={(input) => {
            setActionError(null);
            cloneMutation.mutate({ id: selected.id, input });
          }}
          onCancel={() => setMode('list')}
        />
      )}

      {mode === 'quiebre' && selected && (
        <QuiebreForm
          product={selected}
          submitting={quiebreMutation.isPending}
          serverError={actionError}
          onSubmit={(input) => {
            setActionError(null);
            quiebreMutation.mutate({ id: selected.id, input });
          }}
          onCancel={() => setMode('list')}
        />
      )}

      {mode === 'photos' && selected && (
        <CatalogPhotos product={selected} onClose={() => setMode('list')} />
      )}

      {mode === 'list' && (
        <>
          <form
            className="catalog-filters"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
            }}
          >
            <div className="field">
              <label htmlFor="cf-search">Buscar</label>
              <input
                id="cf-search"
                placeholder="SAP, EAN, marca o nombre"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="cf-cadena">Cadena</label>
              <select
                id="cf-cadena"
                value={cadenaId}
                onChange={(e) => {
                  setCadenaId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas</option>
                {options?.cadenas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cf-seccion">Sección</label>
              <select
                id="cf-seccion"
                value={seccionId}
                onChange={(e) => {
                  setSeccionId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas</option>
                {options?.secciones.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cf-estado">Estado</label>
              <select
                id="cf-estado"
                value={estado}
                onChange={(e) => {
                  setEstado(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos</option>
                <option value="Activo">Activo</option>
                <option value="Bloqueado">Bloqueado</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="cf-quiebre">Quiebre</label>
              <select
                id="cf-quiebre"
                value={quiebreActivo}
                onChange={(e) => {
                  setQuiebreActivo(e.target.value as '' | 'true' | 'false');
                  setPage(1);
                }}
              >
                <option value="">Todos</option>
                <option value="true">Con quiebre</option>
                <option value="false">Sin quiebre</option>
              </select>
            </div>
          </form>

          {listQuery.isLoading && <p>Cargando catálogo…</p>}
          {listQuery.error && (
            <p className="error" role="alert">
              {(listQuery.error as Error).message}
            </p>
          )}
          {actionError && (
            <p className="error" role="alert">
              {actionError}
            </p>
          )}

          <ul className="catalog-list">
            {items.map((product) => (
              <li key={product.id} className="catalog-row">
                <div className="catalog-row-main">
                  <strong>{product.nombreHomologado ?? '(sin nombre homologado)'}</strong>
                  <span className="catalog-row-sub">
                    {product.cadenaNombre} · SAP {product.sap}
                    {product.marcaNombre ? ` · ${product.marcaNombre}` : ''}
                  </span>
                  <div className="badge-row">
                    <EstadoBadge estado={product.estado} />
                    <CampanaBadge
                      activa={product.campanaActiva}
                      desde={product.campanaDesde}
                      hasta={product.campanaHasta}
                    />
                    <QuiebreBadge activo={product.quiebreActivo} />
                  </div>
                </div>
                <div className="catalog-row-metrics">
                  <span>
                    Unidad<strong>{money(product.precio)}</strong>
                  </span>
                  <span>
                    Pack<strong>{money(product.precioPack)}</strong>
                  </span>
                </div>
                    <div className="catalog-row-actions">
                      <button type="button" className="secondary-button" onClick={() => openPhotos(product)}>
                        Fotos
                      </button>
                  {canWrite && (
                    <button type="button" onClick={() => openEdit(product)}>
                      Editar
                    </button>
                  )}
                  {canWrite && (
                    <button type="button" onClick={() => openQuiebre(product)}>
                      {product.quiebreActivo ? 'Revertir quiebre' : 'Declarar quiebre'}
                    </button>
                  )}
                  {isAdmin && (
                    <button type="button" onClick={() => openClone(product)}>
                      Clonar
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => toggleEstado(product)}
                      disabled={statusMutation.isPending}
                    >
                      {product.estado === 'Activo' ? 'Bloquear' : 'Activar'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {!listQuery.isLoading && items.length === 0 && <p>No hay productos que coincidan con los filtros.</p>}

          <nav className="pagination" aria-label="Paginación del catálogo">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
            <span>
              Página {page} de {totalPages} ({total} productos)
            </span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
