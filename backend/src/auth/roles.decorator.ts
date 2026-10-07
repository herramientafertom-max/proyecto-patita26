import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restringe un endpoint a los perfiles listados. Requiere AuthGuard + RolesGuard. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
