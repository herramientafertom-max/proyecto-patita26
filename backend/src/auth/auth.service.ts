import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../database/database.service';
import { AuthUser } from './auth-user';
import { SupabaseJwtService } from './supabase-jwt.service';

type UserRow = {
  id: string;
  tenant_id: string;
  role: string;
  name: string;
  auth_user_id: string | null;
};

const USER_QUERY_BASE = `
  select u.id, u.empresa_cliente_id as tenant_id, u.perfil as role, p.nombre as name, u.auth_user_id
  from public.usuario u
  join public.persona p on p.rut = u.persona_rut
  join public.empresa_cliente ec on ec.id = u.empresa_cliente_id
  where u.estado = 'Activo' and ec.estado = 'Activo'`;

@Injectable()
export class AuthService {
  private readonly secret: string;
  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
    private readonly supabaseJwt: SupabaseJwtService,
  ) {
    this.secret = config.getOrThrow<string>('JWT_SECRET');
  }

  async demoLogin(
    password: string,
    role = 'Administrador',
  ): Promise<{ accessToken: string; user: AuthUser }> {
    if (
      this.config.get('NODE_ENV') === 'production' ||
      this.config.get('ENABLE_DEMO_AUTH') !== 'true'
    )
      throw new NotFoundException();
    const expected = this.config.getOrThrow<string>('DEMO_PASSWORD');
    const actualHash = createHmac('sha256', this.secret)
      .update(password)
      .digest();
    const expectedHash = createHmac('sha256', this.secret)
      .update(expected)
      .digest();
    if (!timingSafeEqual(actualHash, expectedHash))
      throw new UnauthorizedException('Clave de demostración incorrecta');
    const rows = await this.database.query<UserRow>(
      `${USER_QUERY_BASE} and u.perfil = $1
       order by u.creado_en, u.id limit 1`,
      [role],
    );
    if (!rows[0])
      throw new UnauthorizedException('No existe un administrador habilitado');
    const user = this.toAuthUser(rows[0]);
    return {
      accessToken: jwt.sign(user, this.secret, {
        algorithm: 'HS256',
        expiresIn: '8h',
        issuer: 'retail-local',
      }),
      user,
    };
  }

  /**
   * Verifica un Bearer token, sea de Supabase Auth (productivo) o demo local, y resuelve
   * el AuthUser consultando PostgreSQL. Nunca confía en rol/tenant provistos por el token
   * cuando proviene de Supabase: siempre se resuelven desde la base de datos vía
   * auth_user_id.
   */
  async verifyBearerToken(token: string): Promise<AuthUser> {
    if (this.supabaseJwt.isConfigured) {
      try {
        const authUserId = await this.supabaseJwt.verify(token);
        return await this.resolveByAuthUserId(authUserId);
      } catch (error) {
        if (!this.demoFallbackAllowed()) throw error;
      }
    }
    if (!this.demoFallbackAllowed()) throw new UnauthorizedException();
    return this.verifyDemoToken(token);
  }

  /** Verificación síncrona del token demo local (issuer 'retail-local', HS256). */
  verifyDemoToken(token: string): AuthUser {
    const payload = jwt.verify(token, this.secret, {
      algorithms: ['HS256'],
      issuer: 'retail-local',
    });
    if (
      typeof payload === 'string' ||
      !payload.id ||
      !payload.tenantId ||
      !payload.role
    )
      throw new UnauthorizedException();
    return {
      id: String(payload.id),
      tenantId: String(payload.tenantId),
      role: String(payload.role),
      name: String(payload.name ?? ''),
      authUserId: null,
    };
  }

  private demoFallbackAllowed(): boolean {
    return (
      this.config.get('NODE_ENV') !== 'production' &&
      this.config.get('ENABLE_DEMO_AUTH') === 'true'
    );
  }

  private async resolveByAuthUserId(authUserId: string): Promise<AuthUser> {
    const rows = await this.database.query<UserRow>(
      `${USER_QUERY_BASE} and u.auth_user_id = $1`,
      [authUserId],
    );
    if (!rows[0])
      throw new UnauthorizedException(
        'La cuenta no está vinculada a un usuario activo.',
      );
    return this.toAuthUser(rows[0]);
  }

  private toAuthUser(row: UserRow): AuthUser {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      role: row.role,
      name: row.name,
      authUserId: row.auth_user_id,
    };
  }
}
