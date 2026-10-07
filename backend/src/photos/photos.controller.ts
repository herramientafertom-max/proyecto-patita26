import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth-user';
import type { AuthUser } from '../auth/auth-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateFieldPhotoDto } from './dto/create-field-photo.dto';
import { ListFieldPhotosDto } from './dto/list-field-photos.dto';
import type { UploadedPhoto } from './photo-file';
import { PhotosService } from './photos.service';

@ApiTags('photos')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('photos')
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Get('field')
  fieldList(
    @CurrentUser() actor: AuthUser,
    @Query() query: ListFieldPhotosDto,
  ) {
    return this.photos.fieldList(
      actor,
      query.localId,
      query.productId,
      query.days,
    );
  }

  @Post('field')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['localId', 'productId', 'photo'],
      properties: {
        localId: { type: 'string', format: 'uuid' },
        productId: { type: 'string', format: 'uuid' },
        stockAlMomento: { type: 'number' },
        fechaStockSistemico: { type: 'string', format: 'date' },
        photo: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    }),
  )
  createField(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateFieldPhotoDto,
    @UploadedFile() file: UploadedPhoto,
  ) {
    return this.photos.createField(actor, dto, file);
  }

  @Roles('Administrador', 'Supervisor')
  @Get('catalog/:productId')
  catalogList(
    @CurrentUser() actor: AuthUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.photos.catalogList(actor, productId);
  }

  @Roles('Administrador', 'Supervisor')
  @Post('catalog/:productId/:type')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    }),
  )
  setCatalogImage(
    @CurrentUser() actor: AuthUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('type') type: string,
    @UploadedFile() file: UploadedPhoto,
  ) {
    if (!['unidad', 'pack', 'caja'].includes(type))
      throw new BadRequestException('Tipo de imagen no válido.');
    return this.photos.setCatalogImage(actor, productId, type, file);
  }
}
