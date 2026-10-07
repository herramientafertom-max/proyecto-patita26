import { ServiceUnavailableException } from '@nestjs/common';
import { StorageService } from './storage.service';

const photo = {
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  mimetype: 'image/png',
  originalname: 'foto.png',
  size: 4,
};

describe('StorageService', () => {
  it('fails safely when the service role key is not configured', async () => {
    const service = new StorageService({ get: () => '' } as never);
    await expect(
      service.upload('retail', 'tenant', 'field', photo),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('uses the service role key only in backend storage requests', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('', { status: 200 }));
    const service = new StorageService({
      get: (key: string) =>
        key === 'SUPABASE_URL'
          ? 'https://project.supabase.co'
          : 'service-role-key',
    } as never);

    await service.upload('retail', 'tenant', 'field', photo);

    expect(fetchMock).toHaveBeenCalled();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/storage/v1/object/retail/tenant/field/');
    expect(options?.headers).toMatchObject({
      apikey: 'service-role-key',
      authorization: 'Bearer service-role-key',
    });
    fetchMock.mockRestore();
  });
});
