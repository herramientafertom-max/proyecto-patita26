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

type UserRow = { id: string; tenant_id: string; role: string; name: string };

@Injectable()
export class AuthService {
  private readonly secret: string;
  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {
    this.secret = config.getOrThrow<string>('JWT_SECRET');
  }

  async demoLogin(
    password: string,
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
    const rows = await this.database.query<UserRow>(`
      select u.id, u.empresa_cliente_id as tenant_id, u.perfil as role, p.nombre as name
      from public.usuario u join public.persona p on p.rut = u.persona_rut
      where u.estado = 'Activo' and u.perfil = 'Administrador'
      order by u.creado_en, u.id limit 1`);
    if (!rows[0])
      throw new UnauthorizedException('No existe un administrador habilitado');
    const user: AuthUser = {
      id: rows[0].id,
      tenantId: rows[0].tenant_id,
      role: rows[0].role,
      name: rows[0].name,
    };
    return {
      accessToken: jwt.sign(user, this.secret, {
        algorithm: 'HS256',
        expiresIn: '8h',
        issuer: 'retail-local',
      }),
      user,
    };
  }

  verify(token: string): AuthUser {
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
    };
  }
}
