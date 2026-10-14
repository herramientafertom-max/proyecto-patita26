import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { SupabaseJwtService } from './supabase-jwt.service';

const activeUserRow = {
  id: 'user-id',
  tenant_id: 'tenant-id',
  role: 'Administrador',
  name: 'Demo',
  auth_user_id: 'auth-user-id',
};

const DEMO_ADMIN_AUTH_ID = '30000000-0000-4000-8001-000000000001';
const DEMO_REPONEDOR_AUTH_ID = '30000000-0000-4000-8001-000000000003';

function buildConfig(values: Record<string, string>): ConfigService {
  return new ConfigService(values);
}

describe('AuthService — modo demo', () => {
  const config = buildConfig({
    NODE_ENV: 'development',
    ENABLE_DEMO_AUTH: 'true',
    DEMO_PASSWORD: 'demo-password',
    DEMO_AUTH_USER_ID_ADMINISTRADOR: DEMO_ADMIN_AUTH_ID,
    DEMO_AUTH_USER_ID_REPONEDOR: DEMO_REPONEDOR_AUTH_ID,
    JWT_SECRET: 'a-secret-with-more-than-24-characters',
  });
  const database = {
    query: jest.fn().mockResolvedValue([activeUserRow]),
  };
  const supabaseJwt = new SupabaseJwtService(buildConfig({}));
  const service = new AuthService(config, database as never, supabaseJwt);

  it('rechaza una clave incorrecta', async () => {
    await expect(service.demoLogin('wrong-password')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('emite y valida un token local', async () => {
    const result = await service.demoLogin('demo-password');
    expect(service.verifyDemoToken(result.accessToken)).toMatchObject({
      id: 'user-id',
      tenantId: 'tenant-id',
      role: 'Administrador',
      authUserId: null,
    });
  });

  it('resuelve el perfil demo por auth_user_id mediante el mismo bootstrap restringido', async () => {
    await service.demoLogin('demo-password', 'Reponedor');
    expect(database.query).toHaveBeenLastCalledWith(
      expect.stringContaining('public.autenticar_usuario($1::uuid)'),
      [DEMO_REPONEDOR_AUTH_ID],
    );
  });

  it('falla de forma explícita si el perfil demo no tiene identidad configurada', async () => {
    await expect(
      service.demoLogin('demo-password', 'Supervisor'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('verifyBearerToken acepta el token demo cuando Supabase no está configurado', async () => {
    const result = await service.demoLogin('demo-password');
    const user = await service.verifyBearerToken(result.accessToken);
    expect(user.id).toBe('user-id');
  });
});

describe('AuthService — Supabase Auth (secreto compartido HS256)', () => {
  const supabaseSecret = 'supabase-shared-secret-for-tests';
  const config = buildConfig({
    NODE_ENV: 'production',
    ENABLE_DEMO_AUTH: 'false',
    DEMO_PASSWORD: 'demo-password',
    JWT_SECRET: 'a-secret-with-more-than-24-characters',
    SUPABASE_JWT_SECRET: supabaseSecret,
    SUPABASE_JWT_ISSUER: 'https://proyecto.supabase.co/auth/v1',
    SUPABASE_JWT_AUDIENCE: 'authenticated',
  });
  const supabaseJwt = new SupabaseJwtService(config);

  function sign(payload: Record<string, unknown>): string {
    return jwt.sign(payload, supabaseSecret, {
      algorithm: 'HS256',
      issuer: 'https://proyecto.supabase.co/auth/v1',
      audience: 'authenticated',
      subject: 'auth-user-id',
      expiresIn: '1h',
    });
  }

  it('resuelve el AuthUser mediante el bootstrap restringido, no mediante una lectura RLS directa', async () => {
    const database = { query: jest.fn().mockResolvedValue([activeUserRow]) };
    const service = new AuthService(config, database as never, supabaseJwt);
    const token = sign({ role: 'este-rol-no-debe-usarse' });

    const user = await service.verifyBearerToken(token);

    expect(user).toMatchObject({
      id: 'user-id',
      tenantId: 'tenant-id',
      role: 'Administrador',
    });
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('public.autenticar_usuario($1::uuid)'),
      ['auth-user-id'],
    );
  });

  it('rechaza si el usuario no existe, está inactivo o su empresa está inactiva', async () => {
    const database = { query: jest.fn().mockResolvedValue([]) };
    const service = new AuthService(config, database as never, supabaseJwt);
    const token = sign({});

    await expect(service.verifyBearerToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un token firmado con una clave distinta', async () => {
    const database = { query: jest.fn().mockResolvedValue([activeUserRow]) };
    const service = new AuthService(config, database as never, supabaseJwt);
    const forged = jwt.sign({}, 'clave-incorrecta', {
      algorithm: 'HS256',
      issuer: 'https://proyecto.supabase.co/auth/v1',
      audience: 'authenticated',
      subject: 'auth-user-id',
    });

    await expect(service.verifyBearerToken(forged)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza en producción sin fallback a demo aunque Supabase falle', async () => {
    const database = { query: jest.fn().mockResolvedValue([]) };
    const service = new AuthService(config, database as never, supabaseJwt);

    await expect(
      service.verifyBearerToken('token-invalido'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
