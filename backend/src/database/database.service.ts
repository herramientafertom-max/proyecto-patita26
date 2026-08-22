import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

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
      ssl: { rejectUnauthorized: false },
    });
  }

  async query<T extends QueryResultRow>(
    text: string,
    values: unknown[] = [],
  ): Promise<T[]> {
    const result = await this.pool.query<T>(text, values);
    return result.rows;
  }

  async ping(): Promise<boolean> {
    const rows = await this.query<{ ok: number }>('select 1 as ok');
    return rows[0]?.ok === 1;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
