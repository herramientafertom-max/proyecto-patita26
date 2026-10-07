import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Pool, QueryResultRow } from 'pg';
import { AuthUser } from '../auth/auth-user';

export type DbClient = {
  query<T extends QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<T[]>;
};

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly requestClient = new AsyncLocalStorage<DbClient>();

  constructor(config: ConfigService) {
    const rawUrl = config.getOrThrow<string>('DATABASE_URL');
    const connectionString = rawUrl
      .replace(/[?&]pgbouncer=true(&|$)/, '$1')
      .replace(/[?&]$/, '');
    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
      ssl: {
        rejectUnauthorized:
          config.get('DATABASE_SSL_REJECT_UNAUTHORIZED') !== 'false',
      },
    });
  }

  async query<T extends QueryResultRow>(
    text: string,
    values: unknown[] = [],
  ): Promise<T[]> {
    const client = this.requestClient.getStore();
    if (client) return client.query<T>(text, values);
    return (await this.pool.query<T>(text, values)).rows;
  }

  async ping(): Promise<boolean> {
    const rows = await this.query<{ ok: number }>('select 1 as ok');
    return rows[0]?.ok === 1;
  }

  /**
   * Ejecuta `fn` dentro de una única transacción (BEGIN/COMMIT/ROLLBACK) sobre un
   * cliente dedicado del pool. Usar para escrituras multi-tabla que deben ser atómicas.
   */
  async transaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
    const activeClient = this.requestClient.getStore();
    if (activeClient) return fn(activeClient);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const scoped: DbClient = {
        query: async <R extends QueryResultRow>(
          text: string,
          values: unknown[] = [],
        ) => (await client.query<R>(text, values)).rows,
      };
      const result = await fn(scoped);
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  /** Runs authenticated work with an RLS identity scoped to one transaction. */
  async withActor<T>(
    actor: AuthUser,
    fn: (client: DbClient) => Promise<T>,
  ): Promise<T> {
    return this.transaction(async (client) => {
      await client.query(`select set_config('app.usuario_id', $1, true)`, [
        actor.id,
      ]);
      return this.requestClient.run(client, () => fn(client));
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
