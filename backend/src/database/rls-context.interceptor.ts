import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable, from, lastValueFrom } from 'rxjs';
import { AuthenticatedRequest } from '../auth/auth-user';
import { DatabaseService } from './database.service';

export class RlsContextInterceptor implements NestInterceptor {
  constructor(private readonly database: DatabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) return next.handle();
    return from(
      this.database.withActor(request.user, () => lastValueFrom(next.handle())),
    );
  }
}
