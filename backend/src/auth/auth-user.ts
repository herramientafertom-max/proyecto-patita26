import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthUser = {
  id: string;
  tenantId: string;
  role: string;
  name: string;
  /** Cuenta de Supabase Auth vinculada (auth.users.id), o null en modo demo local. */
  authUserId: string | null;
};
export type AuthenticatedRequest = Request & { user: AuthUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    return context.switchToHttp().getRequest<AuthenticatedRequest>().user;
  },
);
