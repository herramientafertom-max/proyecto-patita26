import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './auth-user';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const value = request.headers.get
      ? request.headers.get('authorization')
      : (request.headers as unknown as Record<string, string | undefined>)
          .authorization;
    const token = value?.startsWith('Bearer ') ? value.slice(7) : null;
    if (!token) throw new UnauthorizedException('Token requerido');
    request.user = this.auth.verify(token);
    return true;
  }
}
