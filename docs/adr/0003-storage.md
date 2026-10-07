# ADR 0003 — Storage de fotografías

- **Estado:** aceptado e implementado
- **Decisión:** Supabase Storage con buckets privados para producto y terreno.
- **Alternativa:** servicio S3-compatible externo.
- **Consecuencias:** integración sencilla y lock-in intencional limitado. El backend valida MIME, firma binaria y un máximo de 8 MB; guarda rutas lógicas y entrega URLs firmadas. Requiere `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` solo en backend.
