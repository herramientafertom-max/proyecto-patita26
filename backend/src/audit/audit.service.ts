import { Injectable } from '@nestjs/common';
import { DbClient } from '../database/database.service';
import { AuthUser } from '../auth/auth-user';

export type AuditEntry = {
  accion: string;
  entidadTipo: string;
  entidadId: string;
  valoresAnteriores?: unknown;
  valoresNuevos?: unknown;
  metadata?: Record<string, unknown>;
};

/**
 * Escribe en auditoria_administrativa (append-only, ver migración 007). Debe llamarse
 * con el mismo DbClient de la transacción que realiza el cambio auditado, para que el
 * registro sea atómico con la operación de negocio.
 */
@Injectable()
export class AuditService {
  async record(
    client: DbClient,
    actor: AuthUser,
    entry: AuditEntry,
  ): Promise<void> {
    await client.query(
      `insert into public.auditoria_administrativa
        (empresa_cliente_id, actor_usuario_id, actor_auth_user_id, accion, entidad_tipo, entidad_id, valores_anteriores, valores_nuevos, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        actor.tenantId,
        actor.id,
        actor.authUserId,
        entry.accion,
        entry.entidadTipo,
        entry.entidadId,
        entry.valoresAnteriores !== undefined
          ? JSON.stringify(entry.valoresAnteriores)
          : null,
        entry.valoresNuevos !== undefined
          ? JSON.stringify(entry.valoresNuevos)
          : null,
        JSON.stringify(entry.metadata ?? {}),
      ],
    );
  }
}
