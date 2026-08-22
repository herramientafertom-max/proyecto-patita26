import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { StoresModule } from './stores/stores.module';

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(24).default('local-development-only-change-me'),
  DEMO_PASSWORD: z.string().min(8).default('retail-demo-local'),
  ENABLE_DEMO_AUTH: z.enum(['true', 'false']).default('true'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
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
  ],
})
export class AppModule {}
