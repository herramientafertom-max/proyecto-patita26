import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService, DbClient } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth-user';
import { isForeignKeyViolation } from '../common/db-errors';
import { normalizeRut } from '../common/rut.util';
import { AssignmentDto } from './dto/assignment.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type UserRow = {
  id: string;
  rut: string;
  nombre: string;
  telefono: string | null;
  perfil: string;
  estado: string;
  auth_user_id: string | null;
  creado_en: string;
  actualizado_en: string;
  total?: string;
};

type AssignmentRow = {
  local_id: string;
  codigo_local: string;
  nombre_local: string;
  lunes: boolean;
  martes: boolean;
  miercoles: boolean;
  jueves: boolean;
  viernes: boolean;
  sabado: boolean;
  domingo: boolean;
};

function toSummary(row: UserRow) {
  return {
    id: row.id,
    rut: row.rut,
    nombre: row.nombre,
    telefono: row.telefono,
    perfil: row.perfil,
    estado: row.estado,
    authUserId: row.auth_user_id,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}

function toAssignment(row: AssignmentRow) {
  return {
    localId: row.local_id,
    codigoLocal: row.codigo_local,
    nombreLocal: row.nombre_local,
    dias: {
      lunes: row.lunes,
      martes: row.martes,
      miercoles: row.miercoles,
      jueves: row.jueves,
      viernes: row.viernes,
      sabado: row.sabado,
      domingo: row.domingo,
    },
  };
}

const USER_ROW_QUERY = `
  select u.id, u.persona_rut as rut, p.nombre, p.telefono, u.perfil, u.estado,
         u.auth_user_id, u.creado_en::text, u.actualizado_en::text
  from public.usuario u
  join public.persona p on p.rut = u.persona_rut`;

@Injectable()
export class UsersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser, query: ListUsersQueryDto) {
    const offset = (query.page - 1) * query.limit;
    const rows = await this.database.query<UserRow & { total: string }>(
      `select u.id, u.persona_rut as rut, p.nombre, p.telefono, u.perfil, u.estado,
              u.auth_user_id, u.creado_en::text, u.actualizado_en::text,
              count(*) over()::text as total
       from public.usuario u
       join public.persona p on p.rut = u.persona_rut
       where u.empresa_cliente_id = $1
         and ($2 = '' or p.nombre ilike '%' || $2 || '%' or u.persona_rut ilike '%' || $2 || '%')
         and ($3 = '' or u.perfil = $3)
         and ($4 = '' or u.estado = $4)
       order by p.nombre
       limit $5 offset $6`,
      [
        actor.tenantId,
        query.search,
        query.perfil ?? '',
        query.estado ?? '',
        query.limit,
        offset,
      ],
    );
    return {
      items: rows.map(toSummary),
      total: Number(rows[0]?.total ?? 0),
      page: query.page,
      limit: query.limit,
    };
  }

  async detail(actor: AuthUser, id: string) {
    return this.loadDetail(this.database, actor, id);
  }

  async options(actor: AuthUser) {
    const locales = await this.database.query<{
      id: string;
      codigo: string;
      nombre: string;
      cadena: string;
      subcadena: string;
    }>(
      `select distinct l.id, l.codigo_local as codigo, l.nombre_local as nombre,
              c.nombre as cadena, sc.nombre as subcadena
       from public.local l
       join public.subcadena sc on sc.id = l.subcadena_id
       join public.cadena c on c.id = sc.cadena_id
       where exists (
         select 1 from public.stock_snapshot ss
         where ss.local_id = l.id and ss.empresa_cliente_id = $1
       ) or exists (
         select 1
         from public.usuario_local_asignacion ula
         join public.usuario u on u.id = ula.usuario_id
         where ula.local_id = l.id and u.empresa_cliente_id = $1
       )
       order by c.nombre, sc.nombre, l.nombre_local`,
      [actor.tenantId],
    );
    return { locales };
  }

  async create(actor: AuthUser, dto: CreateUserDto) {
    const rut = normalizeRut(dto.rut);
    return this.database.transaction(async (client) => {
      const duplicate = await client.query<{ id: string }>(
        `select id from public.usuario where empresa_cliente_id = $1 and persona_rut = $2`,
        [actor.tenantId, rut],
      );
      if (duplicate[0]) {
        throw new ConflictException(
          'Ya existe un usuario con ese RUT en esta empresa.',
        );
      }

      await client.query(
        `insert into public.persona (rut, nombre, telefono)
         values ($1, $2, $3)
         on conflict (rut) do nothing`,
        [rut, dto.nombre.trim(), dto.telefono ?? null],
      );

      const inserted = await client.query<{ id: string }>(
        `insert into public.usuario (empresa_cliente_id, persona_rut, perfil, estado)
         values ($1, $2, $3, 'Activo')
         returning id`,
        [actor.tenantId, rut, dto.perfil],
      );
      const usuarioId = inserted[0].id;

      if (dto.asignaciones?.length) {
        await replaceAssignments(client, usuarioId, dto.asignaciones);
      }

      await this.audit.record(client, actor, {
        accion: 'usuario.creado',
        entidadTipo: 'usuario',
        entidadId: usuarioId,
        valoresNuevos: {
          rut,
          nombre: dto.nombre,
          perfil: dto.perfil,
          asignaciones: dto.asignaciones?.length ?? 0,
        },
      });

      return this.loadDetail(client, actor, usuarioId);
    });
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto) {
    return this.database.transaction(async (client) => {
      const before = await this.loadForUpdate(client, actor, id);
      if (!before) throw new NotFoundException('Usuario no encontrado.');

      if (dto.nombre !== undefined || dto.telefono !== undefined) {
        const updated = await client.query<{ rut: string }>(
          `update public.persona p
             set nombre = coalesce($2, p.nombre), telefono = coalesce($3, p.telefono)
           where p.rut = $1
             and not exists (
               select 1 from public.usuario u
               where u.persona_rut = p.rut and u.empresa_cliente_id <> $4
             )
           returning p.rut`,
          [
            before.rut,
            dto.nombre?.trim() ?? null,
            dto.telefono ?? null,
            actor.tenantId,
          ],
        );
        if (!updated[0]) {
          throw new ConflictException(
            'No se pueden editar los datos personales: el RUT está vinculado a otra empresa.',
          );
        }
        await this.audit.record(client, actor, {
          accion: 'usuario.editado',
          entidadTipo: 'usuario',
          entidadId: id,
          valoresAnteriores: {
            nombre: before.nombre,
            telefono: before.telefono,
          },
          valoresNuevos: {
            nombre: dto.nombre ?? before.nombre,
            telefono: dto.telefono ?? before.telefono,
          },
        });
      }

      if (dto.rut !== undefined) {
        const nuevoRut = normalizeRut(dto.rut);
        if (nuevoRut !== before.rut) {
          const duplicate = await client.query<{ id: string }>(
            `select id from public.usuario
             where empresa_cliente_id = $1 and persona_rut = $2 and id <> $3`,
            [actor.tenantId, nuevoRut, id],
          );
          if (duplicate[0]) {
            throw new ConflictException(
              'Ese RUT ya pertenece a otro usuario de esta empresa.',
            );
          }
          await client.query(
            `insert into public.persona (rut, nombre, telefono)
             select $1, p.nombre, p.telefono from public.persona p where p.rut = $2
             on conflict (rut) do nothing`,
            [nuevoRut, before.rut],
          );
          await client.query(
            `update public.usuario set persona_rut = $1 where id = $2`,
            [nuevoRut, id],
          );
          await this.audit.record(client, actor, {
            accion: 'usuario.rut_cambiado',
            entidadTipo: 'usuario',
            entidadId: id,
            valoresAnteriores: { rut: before.rut },
            valoresNuevos: { rut: nuevoRut },
          });
        }
      }

      if (dto.perfil !== undefined && dto.perfil !== before.perfil) {
        await client.query(
          `update public.usuario set perfil = $1 where id = $2`,
          [dto.perfil, id],
        );
        await this.audit.record(client, actor, {
          accion: 'usuario.perfil_cambiado',
          entidadTipo: 'usuario',
          entidadId: id,
          valoresAnteriores: { perfil: before.perfil },
          valoresNuevos: { perfil: dto.perfil },
        });
      }

      if (dto.estado !== undefined && dto.estado !== before.estado) {
        await client.query(
          `update public.usuario set estado = $1 where id = $2`,
          [dto.estado, id],
        );
        await this.audit.record(client, actor, {
          accion:
            dto.estado === 'Activo'
              ? 'usuario.activado'
              : 'usuario.desactivado',
          entidadTipo: 'usuario',
          entidadId: id,
          valoresAnteriores: { estado: before.estado },
          valoresNuevos: { estado: dto.estado },
        });
      }

      if (
        dto.authUserId !== undefined &&
        dto.authUserId !== before.auth_user_id
      ) {
        try {
          await client.query(
            `update public.usuario set auth_user_id = $1 where id = $2`,
            [dto.authUserId, id],
          );
        } catch (error) {
          if (isForeignKeyViolation(error, 'usuario_auth_user_id_fkey')) {
            throw new BadRequestException(
              'La cuenta de Supabase Auth indicada no existe.',
            );
          }
          throw error;
        }
        await this.audit.record(client, actor, {
          accion: dto.authUserId
            ? 'usuario.auth_vinculado'
            : 'usuario.auth_desvinculado',
          entidadTipo: 'usuario',
          entidadId: id,
          valoresAnteriores: { authUserId: before.auth_user_id },
          valoresNuevos: { authUserId: dto.authUserId },
        });
      }

      if (dto.asignaciones !== undefined) {
        const antes = await client.query<{ local_id: string }>(
          `select local_id from public.usuario_local_asignacion where usuario_id = $1`,
          [id],
        );
        await replaceAssignments(client, id, dto.asignaciones);
        await this.audit.record(client, actor, {
          accion: 'usuario.asignaciones_cambiadas',
          entidadTipo: 'usuario',
          entidadId: id,
          valoresAnteriores: { locales: antes.map((r) => r.local_id) },
          valoresNuevos: { locales: dto.asignaciones.map((a) => a.localId) },
        });
      }

      return this.loadDetail(client, actor, id);
    });
  }

  private async loadForUpdate(
    client: DbClient,
    actor: AuthUser,
    id: string,
  ): Promise<UserRow | null> {
    const rows = await client.query<UserRow>(
      `${USER_ROW_QUERY}
       where u.empresa_cliente_id = $1 and u.id = $2
       for update of u`,
      [actor.tenantId, id],
    );
    return rows[0] ?? null;
  }

  private async loadDetail(client: DbClient, actor: AuthUser, id: string) {
    const rows = await client.query<UserRow>(
      `${USER_ROW_QUERY}
       where u.empresa_cliente_id = $1 and u.id = $2`,
      [actor.tenantId, id],
    );
    if (!rows[0]) throw new NotFoundException('Usuario no encontrado.');
    const asignaciones = await client.query<AssignmentRow>(
      `select l.id as local_id, l.codigo_local, l.nombre_local,
              a.lunes, a.martes, a.miercoles, a.jueves, a.viernes, a.sabado, a.domingo
       from public.usuario_local_asignacion a
       join public.local l on l.id = a.local_id
       where a.usuario_id = $1
       order by l.nombre_local`,
      [id],
    );
    return {
      ...toSummary(rows[0]),
      asignaciones: asignaciones.map(toAssignment),
    };
  }
}

async function replaceAssignments(
  client: DbClient,
  usuarioId: string,
  asignaciones: AssignmentDto[],
): Promise<void> {
  const localIds = asignaciones.map((a) => a.localId);
  await client.query(
    `delete from public.usuario_local_asignacion
     where usuario_id = $1 and not (local_id = any($2::uuid[]))`,
    [usuarioId, localIds],
  );
  for (const asignacion of asignaciones) {
    await client.query(
      `insert into public.usuario_local_asignacion
        (usuario_id, local_id, lunes, martes, miercoles, jueves, viernes, sabado, domingo)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (usuario_id, local_id) do update set
        lunes = excluded.lunes, martes = excluded.martes, miercoles = excluded.miercoles,
        jueves = excluded.jueves, viernes = excluded.viernes, sabado = excluded.sabado,
        domingo = excluded.domingo`,
      [
        usuarioId,
        asignacion.localId,
        asignacion.dias.lunes,
        asignacion.dias.martes,
        asignacion.dias.miercoles,
        asignacion.dias.jueves,
        asignacion.dias.viernes,
        asignacion.dias.sabado,
        asignacion.dias.domingo,
      ],
    );
  }
}
