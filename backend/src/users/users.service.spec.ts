import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { UsersService } from './users.service';

const actor: AuthUser = {
  id: 'admin-id',
  tenantId: 'tenant-id',
  role: 'Administrador',
  name: 'Admin',
  authUserId: 'admin-auth-id',
};

const userRow = {
  id: 'user-1',
  rut: '123456785',
  nombre: 'Juan Pérez',
  telefono: '+56911111111',
  perfil: 'Reponedor',
  estado: 'Activo',
  auth_user_id: null,
  creado_en: '2026-08-01T00:00:00.000Z',
  actualizado_en: '2026-08-01T00:00:00.000Z',
};

function makeClient(rules: Array<[string, unknown[]]>) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query = jest.fn((text: string, values: unknown[] = []) => {
    calls.push({ text, values });
    const rule = rules.find(([pattern]) => text.includes(pattern));
    return Promise.resolve(rule ? rule[1] : []);
  });
  return { query, calls };
}

function makeDatabase(client: ReturnType<typeof makeClient>) {
  return {
    query: client.query,
    transaction: jest.fn((fn: (c: typeof client) => unknown) => fn(client)),
  };
}

function makeAudit() {
  return { record: jest.fn().mockResolvedValue(undefined) };
}

describe('UsersService.create', () => {
  it('rechaza un RUT ya usado en la misma empresa', async () => {
    const client = makeClient([
      [
        'select id from public.usuario where empresa_cliente_id = $1 and persona_rut = $2',
        [{ id: 'other' }],
      ],
    ]);
    const database = makeDatabase(client);
    const audit = makeAudit();
    const service = new UsersService(database as never, audit);

    await expect(
      service.create(actor, {
        rut: '12.345.678-5',
        nombre: 'Nuevo',
        perfil: 'Reponedor',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('crea el usuario, replica las asignaciones y registra auditoría', async () => {
    const client = makeClient([
      [
        'select id from public.usuario where empresa_cliente_id = $1 and persona_rut = $2',
        [],
      ],
      ['insert into public.usuario', [{ id: 'user-1' }]],
      ['select u.id, u.persona_rut as rut', [userRow]],
      ['select l.id as local_id', []],
    ]);
    const database = makeDatabase(client);
    const audit = makeAudit();
    const service = new UsersService(database as never, audit);

    const result = await service.create(actor, {
      rut: '12.345.678-5',
      nombre: 'Juan Pérez',
      perfil: 'Reponedor',
      asignaciones: [
        {
          localId: '11111111-1111-1111-1111-111111111111',
          dias: {
            lunes: true,
            martes: false,
            miercoles: false,
            jueves: false,
            viernes: false,
            sabado: false,
            domingo: false,
          },
        },
      ],
    });

    expect(result.id).toBe('user-1');
    expect(audit.record).toHaveBeenCalledWith(
      client,
      actor,
      expect.objectContaining({
        accion: 'usuario.creado',
        entidadTipo: 'usuario',
      }),
    );
    expect(
      client.calls.some((c) =>
        c.text.includes('insert into public.usuario_local_asignacion'),
      ),
    ).toBe(true);
  });

  it('no sobrescribe los datos de una persona existente al crearla en otra empresa', async () => {
    const client = makeClient([
      [
        'select id from public.usuario where empresa_cliente_id = $1 and persona_rut = $2',
        [],
      ],
      ['insert into public.usuario', [{ id: 'user-1' }]],
      ['select u.id, u.persona_rut as rut', [userRow]],
      ['select l.id as local_id', []],
    ]);
    const service = new UsersService(
      makeDatabase(client) as never,
      makeAudit(),
    );

    await service.create(actor, {
      rut: '12.345.678-5',
      nombre: 'Juan Pérez',
      perfil: 'Reponedor',
    });

    expect(
      client.calls.find((call) =>
        call.text.includes('insert into public.persona'),
      )?.text,
    ).toContain('on conflict (rut) do nothing');
  });
});

describe('UsersService.update', () => {
  it('lanza NotFoundException si el usuario no pertenece a la empresa', async () => {
    const client = makeClient([]);
    const database = makeDatabase(client);
    const audit = makeAudit();
    const service = new UsersService(database as never, audit);

    await expect(
      service.update(actor, 'missing-id', { nombre: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('audita el cambio de perfil y de estado por separado', async () => {
    const client = makeClient([
      ['for update of u', [userRow]],
      [
        'select u.id, u.persona_rut as rut',
        [{ ...userRow, perfil: 'Supervisor', estado: 'Inactivo' }],
      ],
      ['select l.id as local_id', []],
    ]);
    const database = makeDatabase(client);
    const audit = makeAudit();
    const service = new UsersService(database as never, audit);

    await service.update(actor, 'user-1', {
      perfil: 'Supervisor',
      estado: 'Inactivo',
    });

    expect(audit.record).toHaveBeenCalledWith(
      client,
      actor,
      expect.objectContaining({ accion: 'usuario.perfil_cambiado' }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      client,
      actor,
      expect.objectContaining({ accion: 'usuario.desactivado' }),
    );
  });

  it('audita la vinculación de la cuenta Supabase Auth', async () => {
    const client = makeClient([
      ['for update of u', [userRow]],
      [
        'select u.id, u.persona_rut as rut',
        [{ ...userRow, auth_user_id: 'new-auth-id' }],
      ],
      ['select l.id as local_id', []],
    ]);
    const database = makeDatabase(client);
    const audit = makeAudit();
    const service = new UsersService(database as never, audit);

    await service.update(actor, 'user-1', {
      authUserId: 'new-auth-id',
    });

    expect(audit.record).toHaveBeenCalledWith(
      client,
      actor,
      expect.objectContaining({ accion: 'usuario.auth_vinculado' }),
    );
  });
});
