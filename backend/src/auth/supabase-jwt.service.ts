import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
  type JWTVerifyOptions,
} from 'jose';

/**
 * Verifica tokens JWT emitidos por Supabase Auth. Nunca decodifica sin verificar la
 * firma criptográfica. Admite dos modos, según configuración:
 *  - SUPABASE_JWT_SECRET: secreto compartido HS256 (proyectos Supabase legacy).
 *  - SUPABASE_URL: claves públicas remotas vía JWKS (proyectos con firma asimétrica).
 * Si ninguna variable está configurada, isConfigured queda en false y solo el modo
 * demo local (si está habilitado) puede autenticar.
 */
@Injectable()
export class SupabaseJwtService {
  private readonly issuer?: string;
  private readonly audience: string;
  private readonly secretKey?: Uint8Array;
  private readonly remoteJwks?: JWTVerifyGetKey;
  readonly isConfigured: boolean;

  constructor(config: ConfigService) {
    this.issuer = config.get<string>('SUPABASE_JWT_ISSUER') || undefined;
    this.audience = config.get<string>(
      'SUPABASE_JWT_AUDIENCE',
      'authenticated',
    );

    const secret = config.get<string>('SUPABASE_JWT_SECRET');
    const supabaseUrl = config.get<string>('SUPABASE_URL');

    if (secret) {
      this.secretKey = new TextEncoder().encode(secret);
    } else if (supabaseUrl) {
      this.remoteJwks = createRemoteJWKSet(
        new URL('/auth/v1/.well-known/jwks.json', supabaseUrl),
      );
    }
    this.isConfigured = Boolean(this.secretKey || this.remoteJwks);
  }

  /** Verifica la firma, `exp`, `iss` y `aud`, y devuelve el `sub` (auth.users.id). */
  async verify(token: string): Promise<string> {
    if (!this.isConfigured) throw new UnauthorizedException();
    const options: JWTVerifyOptions = { audience: this.audience };
    if (this.issuer) options.issuer = this.issuer;

    try {
      const { payload } = this.secretKey
        ? await jwtVerify(token, this.secretKey, {
            ...options,
            algorithms: ['HS256'],
          })
        : await jwtVerify(token, this.remoteJwks as JWTVerifyGetKey, {
            ...options,
            algorithms: ['RS256', 'ES256'],
          });
      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        throw new UnauthorizedException();
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Token de Supabase inválido.');
    }
  }
}
