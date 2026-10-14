import { Pool, PoolClient, QueryResultRow } from 'pg';

const TENANT_A = '10000000-0000-4000-8000-000000000001';
const TENANT_B = '10000000-0000-4000-8000-000000000002';
const SHARED_ARTICLE = '60000000-0000-4000-8000-000000000001';
const SHARED_CHAIN_PRODUCT = '70000000-0000-4000-8000-000000000001';
const TENANT_A_EXCLUSIVE_ARTICLE = '60000000-0000-4000-8000-000000000002';
const TENANT_B_EXCLUSIVE_ARTICLE = '60000000-0000-4000-8000-000000000003';
const TENANT_A_EXCLUSIVE_CHAIN_PRODUCT = '70000000-0000-4000-8000-000000000003';
const TENANT_B_EXCLUSIVE_CHAIN_PRODUCT = '70000000-0000-4000-8000-000000000004';
const TENANT_A_PRODUCT = '80000000-0000-4000-8000-000000000001';
const TENANT_B_PRODUCT = '80000000-0000-4000-8000-000000000002';
const TENANT_A_HOMOLOGATED = '81000000-0000-4000-8000-000000000001';
const TENANT_B_HOMOLOGATED = '81000000-0000-4000-8000-000000000002';
const TENANT_A_STOCK = '90000000-0000-4000-8000-000000000001';
const TENANT_B_STOCK = '90000000-0000-4000-8000-000000000002';
const NEW_HOMOLOGATED_PRODUCT = 'a0000000-0000-4000-8000-000000000001';

type Profile =
  'Administrador' | 'Supervisor' | 'Reponedor' | 'Reponedor Externo';

type FixtureUser = {
  label: string;
  tenantId: string;
  otherTenantId: string;
  userId: string;
  authUserId: string;
  profile: Profile;
  ownProductId: string;
  otherProductId: string;
  ownStockId: string;
  otherStockId: string;
  ownExclusiveArticleId: string;
  otherExclusiveArticleId: string;
  ownExclusiveChainProductId: string;
  otherExclusiveChainProductId: string;
};

const PROFILE_BY_INDEX: readonly Profile[] = [
  'Administrador',
  'Supervisor',
  'Reponedor',
  'Reponedor Externo',
];

function usersForTenant(tenant: 'A' | 'B', tenantDigit: 1 | 2): FixtureUser[] {
  const ownTenantId = tenant === 'A' ? TENANT_A : TENANT_B;
  const otherTenantId = tenant === 'A' ? TENANT_B : TENANT_A;
  const ownProductId = tenant === 'A' ? TENANT_A_PRODUCT : TENANT_B_PRODUCT;
  const otherProductId = tenant === 'A' ? TENANT_B_PRODUCT : TENANT_A_PRODUCT;
  const ownStockId = tenant === 'A' ? TENANT_A_STOCK : TENANT_B_STOCK;
  const otherStockId = tenant === 'A' ? TENANT_B_STOCK : TENANT_A_STOCK;
  const ownExclusiveArticleId =
    tenant === 'A' ? TENANT_A_EXCLUSIVE_ARTICLE : TENANT_B_EXCLUSIVE_ARTICLE;
  const otherExclusiveArticleId =
    tenant === 'A' ? TENANT_B_EXCLUSIVE_ARTICLE : TENANT_A_EXCLUSIVE_ARTICLE;
  const ownExclusiveChainProductId =
    tenant === 'A'
      ? TENANT_A_EXCLUSIVE_CHAIN_PRODUCT
      : TENANT_B_EXCLUSIVE_CHAIN_PRODUCT;
  const otherExclusiveChainProductId =
    tenant === 'A'
      ? TENANT_B_EXCLUSIVE_CHAIN_PRODUCT
      : TENANT_A_EXCLUSIVE_CHAIN_PRODUCT;

  return PROFILE_BY_INDEX.map((profile, index) => {
    const fixtureIndex = index + 1;
    return {
      label: `${tenant} / ${profile}`,
      tenantId: ownTenantId,
      otherTenantId,
      userId: `20000000-0000-4000-800${tenantDigit}-00000000000${fixtureIndex}`,
      authUserId: `30000000-0000-4000-800${tenantDigit}-00000000000${fixtureIndex}`,
      profile,
      ownProductId,
      otherProductId,
      ownStockId,
      otherStockId,
      ownExclusiveArticleId,
      otherExclusiveArticleId,
      ownExclusiveChainProductId,
      otherExclusiveChainProductId,
    };
  });
}

const FIXTURE_USERS = [...usersForTenant('A', 1), ...usersForTenant('B', 2)];

const PRIVILEGED_USERS = FIXTURE_USERS.filter(
  ({ profile }) => profile === 'Administrador' || profile === 'Supervisor',
);
const OPERATIONAL_USERS = FIXTURE_USERS.filter(
  ({ profile }) => profile === 'Reponedor' || profile === 'Reponedor Externo',
);

function integrationDatabaseUrl(): string {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error(
      'DATABASE_URL es obligatoria para la suite de integración aislada.',
    );
  }

  const url = new URL(rawUrl);
  const database = url.pathname.replace(/^\//, '');
  if (
    !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    database !== 'retail_integration' ||
    url.username !== 'retail_api'
  ) {
    throw new Error(
      'La suite solo acepta retail_api sobre retail_integration en localhost.',
    );
  }
  return rawUrl;
}

async function withActor<T>(
  pool: Pool,
  userId: string,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(`select set_config('app.usuario_id', $1::text, true)`, [
      userId,
    ]);
    return await work(client);
  } finally {
    await client.query('rollback');
    client.release();
  }
}

async function ids<T extends QueryResultRow>(
  client: PoolClient,
  sql: string,
  values: unknown[] = [],
): Promise<T[]> {
  return (await client.query<T>(sql, values)).rows;
}

describe('seguridad PostgreSQL con retail_api y RLS', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({
      connectionString: integrationDatabaseUrl(),
      max: 4,
      application_name: 'retail-security-integration-tests',
    });
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('ejecuta como retail_api restringido, sin herencia, replicación, superusuario ni BYPASSRLS', async () => {
    const result = await pool.query<{
      current_user: string;
      rolinherit: boolean;
      rolsuper: boolean;
      rolbypassrls: boolean;
      rolreplication: boolean;
    }>(
      `select current_user,
              r.rolinherit,
              r.rolsuper,
              r.rolbypassrls,
              r.rolreplication
       from pg_catalog.pg_roles r
       where r.rolname = current_user`,
    );

    expect(result.rows).toEqual([
      {
        current_user: 'retail_api',
        rolinherit: false,
        rolsuper: false,
        rolbypassrls: false,
        rolreplication: false,
      },
    ]);
  });

  it('aplica el contrato SQL de mínimo privilegio de la API', async () => {
    const result = await pool.query<{
      can_read_products: boolean;
      can_update_products: boolean;
      can_delete_products: boolean;
      can_update_articles: boolean;
      can_update_chain_products: boolean;
      can_execute_bootstrap: boolean;
      can_create_in_public: boolean;
      can_use_public: boolean;
      has_sequence_update: boolean;
    }>(
      `select has_table_privilege(current_user, 'public.producto_cliente', 'SELECT') as can_read_products,
              has_table_privilege(current_user, 'public.producto_cliente', 'UPDATE') as can_update_products,
              has_table_privilege(current_user, 'public.producto_cliente', 'DELETE') as can_delete_products,
              has_table_privilege(current_user, 'public.articulo', 'UPDATE') as can_update_articles,
              has_table_privilege(current_user, 'public.producto_cadena', 'UPDATE') as can_update_chain_products,
              has_function_privilege(current_user, 'public.autenticar_usuario(uuid)', 'EXECUTE') as can_execute_bootstrap,
              has_schema_privilege(current_user, 'public', 'CREATE') as can_create_in_public,
              has_schema_privilege(current_user, 'public', 'USAGE') as can_use_public,
              exists (
                select 1
                from pg_catalog.pg_class sequence
                join pg_catalog.pg_namespace namespace on namespace.oid = sequence.relnamespace
                where namespace.nspname = 'public'
                  and sequence.relkind = 'S'
                  and has_sequence_privilege(current_user, sequence.oid, 'UPDATE')
              ) as has_sequence_update`,
    );

    expect(result.rows[0]).toEqual({
      can_read_products: true,
      can_update_products: true,
      can_delete_products: false,
      can_update_articles: false,
      can_update_chain_products: false,
      can_execute_bootstrap: true,
      can_create_in_public: false,
      can_use_public: true,
      has_sequence_update: false,
    });
  });

  it('no hereda privilegios por membresía ni es propietario de tablas public', async () => {
    const result = await pool.query<{
      memberships: string;
      owned_tables: string;
      owns_public_schema: boolean;
    }>(
      `select
         (select count(*)::text
            from pg_catalog.pg_auth_members membership
            join pg_catalog.pg_roles member_role on member_role.oid = membership.member
           where member_role.rolname = current_user) as memberships,
         (select count(*)::text
            from pg_catalog.pg_class relation
            join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
            join pg_catalog.pg_roles owner_role on owner_role.oid = relation.relowner
           where namespace.nspname = 'public'
             and owner_role.rolname = current_user
             and relation.relkind in ('r', 'p')) as owned_tables,
         (select namespace.nspowner = (select oid from pg_catalog.pg_roles where rolname = current_user)
            from pg_catalog.pg_namespace namespace
           where namespace.nspname = 'public') as owns_public_schema`,
    );

    expect(result.rows[0]).toEqual({
      memberships: '0',
      owned_tables: '0',
      owns_public_schema: false,
    });
  });

  describe.each(FIXTURE_USERS)('bootstrap $label', (fixture) => {
    it('resuelve únicamente la identidad activa vinculada al auth_user_id verificado', async () => {
      const result = await pool.query<{
        id: string;
        tenant_id: string;
        role: string;
        name: string;
        auth_user_id: string;
      }>(
        `select id, tenant_id, role, name, auth_user_id
         from public.autenticar_usuario($1::uuid)`,
        [fixture.authUserId],
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        id: fixture.userId,
        tenant_id: fixture.tenantId,
        role: fixture.profile,
        auth_user_id: fixture.authUserId,
      });
      expect(result.rows[0].name).toEqual(expect.any(String));
    });
  });

  it('no revela usuarios ante un auth_user_id desconocido', async () => {
    const result = await pool.query(
      `select *
       from public.autenticar_usuario($1::uuid)`,
      ['39999999-9999-4999-8999-999999999999'],
    );
    expect(result.rows).toEqual([]);
  });

  describe.each(FIXTURE_USERS)('aislamiento de lectura $label', (fixture) => {
    it('establece la identidad transaccional esperada', async () => {
      await withActor(pool, fixture.userId, async (client) => {
        const result = await client.query<{
          user_id: string;
          tenant_id: string;
          profile: string;
        }>(
          `select public.usuario_actual() as user_id,
                  public.empresa_cliente_actual() as tenant_id,
                  public.perfil_actual() as profile`,
        );
        expect(result.rows[0]).toEqual({
          user_id: fixture.userId,
          tenant_id: fixture.tenantId,
          profile: fixture.profile,
        });
      });
    });

    it('puede leer el catálogo global necesario para operar', async () => {
      await withActor(pool, fixture.userId, async (client) => {
        const result = await client.query<{ id: string }>(
          `select id
           from public.producto_cadena
           where id = $1`,
          [SHARED_CHAIN_PRODUCT],
        );
        expect(result.rows).toEqual([{ id: SHARED_CHAIN_PRODUCT }]);
      });
    });

    it('ve sus cuatro usuarios y ninguna persona privada de la otra empresa', async () => {
      await withActor(pool, fixture.userId, async (client) => {
        const ownUsers = await ids<{ id: string }>(
          client,
          `select id
           from public.usuario
           where empresa_cliente_id = $1
           order by id`,
          [fixture.tenantId],
        );
        const foreignUsers = await ids<{ id: string }>(
          client,
          `select id
           from public.usuario
           where empresa_cliente_id = $1`,
          [fixture.otherTenantId],
        );
        const visiblePeople = await client.query<{ count: string }>(
          `select count(*)::text as count from public.persona`,
        );

        expect(ownUsers).toHaveLength(4);
        expect(foreignUsers).toEqual([]);
        expect(visiblePeople.rows[0].count).toBe('4');
      });
    });

    it('lee producto y stock propios, pero no los identificadores del otro tenant', async () => {
      await withActor(pool, fixture.userId, async (client) => {
        const ownProduct = await ids<{ id: string }>(
          client,
          `select id from public.producto_cliente where id = $1`,
          [fixture.ownProductId],
        );
        const foreignProduct = await ids<{ id: string }>(
          client,
          `select id from public.producto_cliente where id = $1`,
          [fixture.otherProductId],
        );
        const ownStock = await ids<{ id: string }>(
          client,
          `select id from public.stock_snapshot where id = $1`,
          [fixture.ownStockId],
        );
        const foreignStock = await ids<{ id: string }>(
          client,
          `select id from public.stock_snapshot where id = $1`,
          [fixture.otherStockId],
        );

        expect(ownProduct).toEqual([{ id: fixture.ownProductId }]);
        expect(foreignProduct).toEqual([]);
        expect(ownStock).toEqual([{ id: fixture.ownStockId }]);
        expect(foreignStock).toEqual([]);
      });
    });

    it('no puede modificar un producto privado del otro tenant', async () => {
      await withActor(pool, fixture.userId, async (client) => {
        const result = await client.query<{ id: string }>(
          `update public.producto_cliente
           set precio = precio
           where id = $1
           returning id`,
          [fixture.otherProductId],
        );
        expect(result.rows).toEqual([]);
      });
    });
  });

  describe.each(PRIVILEGED_USERS)('escritura autorizada $label', (fixture) => {
    it('puede modificar el producto de su propia empresa', async () => {
      await withActor(pool, fixture.userId, async (client) => {
        const result = await client.query<{ id: string }>(
          `update public.producto_cliente
           set precio = precio
           where id = $1
           returning id`,
          [fixture.ownProductId],
        );
        expect(result.rows).toEqual([{ id: fixture.ownProductId }]);
      });
    });

    it('rechaza la mutación segura si el artículo también es usado por otra empresa', async () => {
      await withActor(pool, fixture.userId, async (client) => {
        const result = await client.query<{ updated: boolean }>(
          `select public.actualizar_unidades_articulo_seguro($1::uuid, $2::numeric) as updated`,
          [SHARED_ARTICLE, 99],
        );
        expect(result.rows).toEqual([{ updated: false }]);
      });
    });

    it('actualiza artículo y producto de cadena exclusivos de su empresa', async () => {
      await withActor(pool, fixture.userId, async (client) => {
        const article = await client.query<{ updated: boolean }>(
          `select public.actualizar_unidades_articulo_seguro($1::uuid, $2::numeric) as updated`,
          [fixture.ownExclusiveArticleId, 24],
        );
        const chainProduct = await client.query<{ updated: boolean }>(
          `select public.actualizar_producto_cadena_seguro(
             $1::uuid, $2::text, $3::uuid, $4::text, $5::text
           ) as updated`,
          [
            fixture.ownExclusiveChainProductId,
            null,
            fixture.ownExclusiveArticleId,
            'Nombre autorizado',
            'Marca autorizada',
          ],
        );

        expect(article.rows).toEqual([{ updated: true }]);
        expect(chainProduct.rows).toEqual([{ updated: true }]);
      });
    });

    it('rechaza las funciones seguras sobre entidades exclusivas del otro tenant', async () => {
      await withActor(pool, fixture.userId, async (client) => {
        const article = await client.query<{ updated: boolean }>(
          `select public.actualizar_unidades_articulo_seguro($1::uuid, $2::numeric) as updated`,
          [fixture.otherExclusiveArticleId, 24],
        );
        const chainProduct = await client.query<{ updated: boolean }>(
          `select public.actualizar_producto_cadena_seguro(
             $1::uuid, $2::text, $3::uuid, $4::text, $5::text
           ) as updated`,
          [
            fixture.otherExclusiveChainProductId,
            null,
            fixture.otherExclusiveArticleId,
            'Intento cruzado',
            'Marca cruzada',
          ],
        );

        expect(article.rows).toEqual([{ updated: false }]);
        expect(chainProduct.rows).toEqual([{ updated: false }]);
      });
    });

    it('rechaza unidades por caja nulas, negativas o decimales dentro de PostgreSQL', async () => {
      await withActor(pool, fixture.userId, async (client) => {
        for (const invalidValue of [null, -1, 1.5]) {
          const result = await client.query<{ updated: boolean }>(
            `select public.actualizar_unidades_articulo_seguro($1::uuid, $2::numeric) as updated`,
            [fixture.ownExclusiveArticleId, invalidValue],
          );
          expect(result.rows).toEqual([{ updated: false }]);
        }
      });
    });

    it('puede insertar una homologación propia y no una ajena', async () => {
      await withActor(pool, fixture.userId, async (client) => {
        const ownInsert = await client.query<{ id: string }>(
          `insert into public.producto_homologado
             (id, empresa_cliente_id, nombre_homologado)
           values ($1, $2, $3)
           returning id`,
          [NEW_HOMOLOGATED_PRODUCT, fixture.tenantId, 'Integración segura'],
        );
        expect(ownInsert.rows).toEqual([{ id: NEW_HOMOLOGATED_PRODUCT }]);
      });

      await withActor(pool, fixture.userId, async (client) => {
        await expect(
          client.query(
            `insert into public.producto_homologado
               (id, empresa_cliente_id, nombre_homologado)
             values ($1, $2, $3)`,
            [
              NEW_HOMOLOGATED_PRODUCT,
              fixture.otherTenantId,
              'Inyección cruzada',
            ],
          ),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });

    it('no puede enlazar su producto con una homologación privada del otro tenant', async () => {
      const foreignHomologated =
        fixture.tenantId === TENANT_A
          ? TENANT_B_HOMOLOGATED
          : TENANT_A_HOMOLOGATED;
      await withActor(pool, fixture.userId, async (client) => {
        await expect(
          client.query(
            `update public.producto_cliente
                set producto_homologado_id = $2
              where id = $1
              returning id`,
            [fixture.ownProductId, foreignHomologated],
          ),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });
  });

  describe.each(OPERATIONAL_USERS)(
    'escritura restringida $label',
    (fixture) => {
      it('no puede modificar ni siquiera el catálogo privado de su empresa', async () => {
        await withActor(pool, fixture.userId, async (client) => {
          const result = await client.query<{ id: string }>(
            `update public.producto_cliente
           set precio = precio
           where id = $1
           returning id`,
            [fixture.ownProductId],
          );
          expect(result.rows).toEqual([]);
        });
      });

      it('no puede aprovechar WITH CHECK para insertar dentro de su tenant', async () => {
        await withActor(pool, fixture.userId, async (client) => {
          await expect(
            client.query(
              `insert into public.producto_homologado
                 (id, empresa_cliente_id, nombre_homologado)
               values ($1, $2, $3)`,
              [
                NEW_HOMOLOGATED_PRODUCT,
                fixture.tenantId,
                'Inserción no autorizada',
              ],
            ),
          ).rejects.toMatchObject({ code: '42501' });
        });
      });

      it('no puede usar las funciones privilegiadas ni sobre catálogo exclusivo propio', async () => {
        await withActor(pool, fixture.userId, async (client) => {
          try {
            const article = await client.query<{ updated: boolean }>(
              `select public.actualizar_unidades_articulo_seguro($1::uuid, $2::numeric) as updated`,
              [fixture.ownExclusiveArticleId, 99],
            );
            const chainProduct = await client.query<{ updated: boolean }>(
              `select public.actualizar_producto_cadena_seguro(
                 $1::uuid, $2::text, $3::uuid, $4::text, $5::text
               ) as updated`,
              [
                fixture.ownExclusiveChainProductId,
                null,
                fixture.ownExclusiveArticleId,
                'Intento operacional',
                'Marca operacional',
              ],
            );
            expect(article.rows).toEqual([{ updated: false }]);
            expect(chainProduct.rows).toEqual([{ updated: false }]);
          } catch (error: unknown) {
            expect(error).toMatchObject({ code: '42501' });
          }
        });
      });
    },
  );

  describe.each(FIXTURE_USERS)('catálogo compartido $label', (fixture) => {
    it('no permite mutar directamente un artículo global', async () => {
      await withActor(pool, fixture.userId, async (client) => {
        try {
          const result = await client.query<{ id: string }>(
            `update public.articulo
             set unidades_por_caja = unidades_por_caja
             where id = $1
             returning id`,
            [SHARED_ARTICLE],
          );
          expect(result.rows).toEqual([]);
        } catch (error: unknown) {
          expect(error).toMatchObject({ code: '42501' });
        }
      });
    });
  });
});
