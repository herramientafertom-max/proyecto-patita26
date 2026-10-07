import { randomUUID } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadedPhoto, validatePhoto } from './photo-file';

@Injectable()
export class StorageService {
  private readonly url: string;
  private readonly serviceKey: string;

  constructor(config: ConfigService) {
    this.url = config.get<string>('SUPABASE_URL', '').replace(/\/$/, '');
    this.serviceKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY', '');
  }

  async upload(
    bucket: string,
    tenantId: string,
    category: string,
    file: UploadedPhoto,
  ) {
    const extension = validatePhoto(file);
    this.ensureConfigured();
    const now = new Date();
    const path = `${tenantId}/${category}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${extension}`;
    const response = await fetch(
      `${this.url}/storage/v1/object/${bucket}/${path}`,
      {
        method: 'POST',
        headers: {
          apikey: this.serviceKey,
          authorization: `Bearer ${this.serviceKey}`,
          'content-type': file.mimetype,
          'x-upsert': 'false',
        },
        body: new Uint8Array(file.buffer),
      },
    );
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'No fue posible guardar la fotografía en Storage.',
      );
    }
    return path;
  }

  async signedUrl(bucket: string, path: string | null): Promise<string | null> {
    if (!path || !this.url || !this.serviceKey) return null;
    const response = await fetch(
      `${this.url}/storage/v1/object/sign/${bucket}/${path}`,
      {
        method: 'POST',
        headers: {
          apikey: this.serviceKey,
          authorization: `Bearer ${this.serviceKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 3600 }),
      },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      signedURL?: string;
      signedUrl?: string;
    };
    const signed = data.signedURL ?? data.signedUrl;
    if (!signed) return null;
    return signed.startsWith('http')
      ? signed
      : `${this.url}/storage/v1${signed}`;
  }

  private ensureConfigured() {
    if (!this.url || !this.serviceKey) {
      throw new ServiceUnavailableException(
        'La carga de fotografías aún no está configurada. Falta conectar Supabase Storage.',
      );
    }
  }
}
