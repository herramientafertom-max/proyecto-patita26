import { AuthUser } from '../auth/auth-user';
import { StoresService } from './stores.service';

const worker: AuthUser = {
  id: 'worker-id',
  tenantId: 'tenant-id',
  role: 'Reponedor',
  name: 'Trabajador',
  authUserId: 'auth-id',
};

describe('StoresService.myRoute', () => {
  it('returns only the worker assignments with their scheduled days', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        id: 'store-1',
        code: 'L001',
        name: 'Local Uno',
        chain: 'Cadena',
        subchain: 'Sucursal',
        status: 'Activo',
        lunes: true,
        martes: false,
        miercoles: true,
        jueves: false,
        viernes: false,
        sabado: false,
        domingo: false,
      },
    ]);
    const service = new StoresService({ query } as never);

    const result = await service.myRoute(worker);

    expect(query).toHaveBeenCalledWith(expect.any(String), ['worker-id']);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('store-1');
    expect(result.items[0]?.days).toMatchObject({
      lunes: true,
      martes: false,
      miercoles: true,
    });
  });
});
