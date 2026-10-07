import { FormEvent, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CatalogProduct } from './catalog';
import { photosApi } from './photos';

const TYPES = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'pack', label: 'Pack' },
  { value: 'caja', label: 'Caja' },
] as const;

export default function CatalogPhotos({ product, onClose }: { product: CatalogProduct; onClose: () => void }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<'unidad' | 'pack' | 'caja'>('unidad');
  const [error, setError] = useState('');
  const detail = useQuery({ queryKey: ['catalog-photos', product.id], queryFn: () => photosApi.catalog(product.id) });
  const upload = useMutation({
    mutationFn: (file: File) => photosApi.uploadCatalog(product.id, type, file),
    onSuccess: () => {
      setError('');
      if (fileRef.current) fileRef.current.value = '';
      void queryClient.invalidateQueries({ queryKey: ['catalog-photos', product.id] });
    },
    onError: (err: Error) => setError(err.message),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setError('Selecciona una fotografía.');
    upload.mutate(file);
  }
  return <section className="panel form-panel catalog-photos" aria-labelledby="catalog-photos-title">
    <div className="history-heading"><div><p className="eyebrow">Catálogo visual</p><h2 id="catalog-photos-title">Fotos de {product.nombreHomologado ?? product.sap}</h2></div><button type="button" className="secondary-button" onClick={onClose}>Volver</button></div>
    <div className="catalog-photo-grid">{TYPES.map(({ value, label }) => {
      const image = detail.data?.items.find((item) => item.tipo === value);
      return <article className="catalog-photo-slot" key={value}><strong>{label}</strong>{image?.url ? <a href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={`${label} de ${product.nombreHomologado ?? product.sap}`} /></a> : <div className="photo-unavailable">Sin fotografía</div>}<small>{image?.referenciaArchivo ? 'Imagen registrada' : 'Pendiente'}</small></article>;
    })}</div>
    <form className="photo-upload catalog-photo-upload" onSubmit={submit}><div className="field"><label htmlFor="catalog-photo-type">Tipo</label><select id="catalog-photo-type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>{TYPES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></div><div className="field"><label htmlFor="catalog-photo-file">Archivo</label><input ref={fileRef} id="catalog-photo-file" type="file" accept="image/jpeg,image/png,image/webp" required /></div><button type="submit" disabled={upload.isPending}>{upload.isPending ? 'Subiendo…' : 'Guardar imagen'}</button></form>
    {(error || detail.error) && <p className="error" role="alert">{error || detail.error?.message}</p>}
    <p className="field-hint">Al subir otra imagen del mismo tipo, la referencia vigente se reemplaza y el cambio queda auditado.</p>
  </section>;
}
