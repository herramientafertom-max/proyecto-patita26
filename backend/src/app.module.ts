import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { ProductsModule } from './products/products.module';
import { StoresModule } from './stores/stores.module';
import { UsersModule } from './users/users.module';
import { PhotosModule } from './photos/photos.module';

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(24).default('local-development-only-change-me'),
  DEMO_PASSWORD: z.string().min(8).default('retail-demo-local'),
  ENABLE_DEMO_AUTH: z.enum(['true', 'false']).default('true'),
  DEMO_AUTH_USER_ID_ADMINISTRADOR: z
    .string()
    .uuid()
    .optional()
    .or(z.literal('')),
  DEMO_AUTH_USER_ID_SUPERVISOR: z.string().uuid().optional().or(z.literal('')),
  DEMO_AUTH_USER_ID_REPONEDOR: z.string().uuid().optional().or(z.literal('')),
  DEMO_AUTH_USER_ID_REPONEDOR_EXTERNO: z
    .string()
    .uuid()
    .optional()
    .or(z.literal('')),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  SUPABASE_JWT_SECRET: z.string().min(1).optional().or(z.literal('')),
  SUPABASE_JWT_ISSUER: z.string().min(1).optional().or(z.literal('')),
  SUPABASE_JWT_AUDIENCE: z.string().min(1).default('authenticated'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional().or(z.literal('')),
  DATABASE_SSL_REJECT_UNAUTHORIZED: z.enum(['true', 'false']).default('true'),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../credenciales.txt'],
      validate: (value) => schema.parse(value),
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    StoresModule,
    UsersModule,
    PhotosModule,
    ProductsModule,
  ],
})
export class AppModule {}
