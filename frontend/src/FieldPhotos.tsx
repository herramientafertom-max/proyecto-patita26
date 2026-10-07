import { FormEvent, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Product, Store } from './api';
import { photosApi } from './photos';

export default function FieldPhotos({ store, product }: { store: Store; product: Product }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stock, setStock] = useState(product.stock ?? '');
  const [stockDate, setStockDate] = useState(product.stockDate?.slice(0, 10) ?? '');
  const [error, setError] = useState('');
  const photos = useQuery({ queryKey: ['field-photos', store.id, product.id], queryFn: () => photosApi.field(store.id, product.id) });
  const upload = useMutation({
    mutationFn: (file: File) => photosApi.uploadField(store.id, product.id, file, stock, stockDate),
    onSuccess: () => { setError(''); if (fileRef.current) fileRef.current.value = ''; void queryClient.invalidateQueries({ queryKey: ['field-photos', store.id, product.id] }); },
    onError: (err: Error) => setError(err.message),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setError('Selecciona o toma una fotografía.');
    setError('');
    upload.mutate(file);
  }

  return <section className="field-photos" aria-labelledby="field-photos-title">
    <div className="history-heading"><div><p className="eyebrow">Evidencia de terreno</p><h3 id="field-photos-title">Fotografías recientes</h3></div><span className="badge badge-neutral">15 días</span></div>
    <form className="photo-upload" onSubmit={submit}>
      <div className="field"><label htmlFor="terrain-photo">Fotografía</label><input ref={fileRef} id="terrain-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required /></div>
      <div className="field"><label htmlFor="terrain-stock">Stock observado</label><input id="terrain-stock" type="number" min="0" step="0.01" value={stock} onChange={(e) => setStock(e.target.value)} /></div>
      <div className="field"><label htmlFor="terrain-stock-date">Fecha stock sistema</label><input id="terrain-stock-date" type="date" value={stockDate} onChange={(e) => setStockDate(e.target.value)} /></div>
      <button type="submit" disabled={upload.isPending}>{upload.isPending ? 'Subiendo…' : 'Guardar fotografía'}</button>
    </form>
    {(error || photos.error) && <p className="error" role="alert">{error || photos.error?.message}</p>}
    {photos.isLoading && <p>Cargando fotografías…</p>}
    <div className="photo-grid">{photos.data?.items.map((photo) => <article className="photo-card" key={photo.id}>{photo.url ? <a href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={`Registro de ${product.name} tomado por ${photo.usuarioNombre}`} loading="lazy" /></a> : <div className="photo-unavailable">Imagen histórica no disponible</div>}<div><strong>{new Date(photo.fecha).toLocaleString('es-CL')}</strong><span>{photo.usuarioNombre}</span><span>Stock observado: {photo.stockAlMomento ?? '—'}</span></div></article>)}</div>
    {photos.data?.items.length === 0 && <p>Aún no hay fotografías recientes de este producto en el local.</p>}
  </section>;
}
