import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles.guard';
import { SupabaseJwtService } from './supabase-jwt.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, SupabaseJwtService],
  exports: [AuthService, AuthGuard, RolesGuard],
})
export class AuthModule {}
