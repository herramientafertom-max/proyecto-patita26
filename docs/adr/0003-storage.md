# ADR 0003 — Storage de fotografías

- **Estado:** propuesto
- **Recomendación:** Supabase Storage con buckets privados para producto y terreno.
- **Alternativa:** servicio S3-compatible externo.
- **Consecuencias:** integración sencilla y lock-in intencional limitado; se deben crear políticas, límites MIME/tamaño, compresión y URLs firmadas antes de habilitar uploads.
