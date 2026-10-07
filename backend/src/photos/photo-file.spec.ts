import { BadRequestException } from '@nestjs/common';
import { validatePhoto } from './photo-file';

describe('validatePhoto', () => {
  it('acepta una imagen JPEG cuyo contenido coincide', () => {
    expect(
      validatePhoto({
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
        mimetype: 'image/jpeg',
        originalname: 'foto.jpg',
        size: 4,
      }),
    ).toBe('jpg');
  });

  it('rechaza un archivo que solo declara ser imagen', () => {
    expect(() =>
      validatePhoto({
        buffer: Buffer.from('texto'),
        mimetype: 'image/jpeg',
        originalname: 'engaño.jpg',
        size: 5,
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza archivos mayores a ocho megabytes', () => {
    expect(() =>
      validatePhoto({
        buffer: Buffer.from([0xff, 0xd8, 0xff]),
        mimetype: 'image/jpeg',
        originalname: 'grande.jpg',
        size: 8 * 1024 * 1024 + 1,
      }),
    ).toThrow('8 MB');
  });
});
