# Despliegue

## Desarrollo Docker

```bash
./scripts/docker-up-local.sh
```

Servicios:

- `frontend`: Nginx, puerto host 8080.
- `backend`: NestJS, red interna, healthcheck en `/api/v1/health`.

## Producción

Antes de producción:

1. Desactivar demo auth.
2. Configurar Supabase Auth real.
3. Usar secretos administrados y rotar credenciales actuales.
4. Crear usuario PostgreSQL de mínimo privilegio.
5. Terminar y probar RLS multi-tenant.
6. Configurar TLS, dominio, backups, logs y rollback.
7. Ejecutar CI y pruebas de aislamiento.

Las imágenes no dependen de un proveedor de hosting específico.
