import { BadRequestException } from '@nestjs/common';

export type UploadedPhoto = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

const TYPES: Record<string, { extension: string; signatures: number[][] }> = {
  'image/jpeg': { extension: 'jpg', signatures: [[0xff, 0xd8, 0xff]] },
  'image/png': { extension: 'png', signatures: [[0x89, 0x50, 0x4e, 0x47]] },
  'image/webp': { extension: 'webp', signatures: [[0x52, 0x49, 0x46, 0x46]] },
};

export function validatePhoto(file?: UploadedPhoto): string {
  if (!file) throw new BadRequestException('Debes adjuntar una fotografía.');
  if (file.size > 8 * 1024 * 1024) {
    throw new BadRequestException('La fotografía no puede superar 8 MB.');
  }
  const allowed = TYPES[file.mimetype];
  if (!allowed) {
    throw new BadRequestException(
      'Formato no permitido. Usa JPEG, PNG o WebP.',
    );
  }
  const matches = allowed.signatures.some((signature) =>
    signature.every((byte, index) => file.buffer[index] === byte),
  );
  const webp =
    file.mimetype !== 'image/webp' ||
    file.buffer.subarray(8, 12).toString() === 'WEBP';
  if (!matches || !webp) {
    throw new BadRequestException(
      'El contenido del archivo no corresponde a una imagen válida.',
    );
  }
  return allowed.extension;
}
