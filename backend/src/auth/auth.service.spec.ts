import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const config = new ConfigService({
    NODE_ENV: 'development',
    ENABLE_DEMO_AUTH: 'true',
    DEMO_PASSWORD: 'demo-password',
    JWT_SECRET: 'a-secret-with-more-than-24-characters',
  });
  const database = {
    query: jest.fn().mockResolvedValue([
      {
        id: 'user-id',
        tenant_id: 'tenant-id',
        role: 'Administrador',
        name: 'Demo',
      },
    ]),
  };
  const service = new AuthService(config, database as never);

  it('rechaza una clave incorrecta', async () => {
    await expect(service.demoLogin('wrong-password')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('emite y valida un token local', async () => {
    const result = await service.demoLogin('demo-password');
    expect(service.verify(result.accessToken)).toMatchObject({
      id: 'user-id',
      tenantId: 'tenant-id',
      role: 'Administrador',
    });
  });
});
