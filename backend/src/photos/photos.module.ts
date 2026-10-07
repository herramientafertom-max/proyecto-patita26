import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';
import { StorageService } from './storage.service';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [PhotosController],
  providers: [PhotosService, StorageService],
})
export class PhotosModule {}
