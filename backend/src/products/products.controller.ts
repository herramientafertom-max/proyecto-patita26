import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth-user';
import type { AuthUser } from '../auth/auth-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CloneProductDto } from './dto/clone-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { QuiebreProductDto } from './dto/quiebre-product.dto';
import { StatusProductDto } from './dto/status-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

const ADMIN_Y_SUPERVISOR = ['Administrador', 'Supervisor'];

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Roles(...ADMIN_Y_SUPERVISOR)
  @Get()
  list(@CurrentUser() actor: AuthUser, @Query() query: ListProductsQueryDto) {
    return this.products.list(actor, query);
  }

  @Roles(...ADMIN_Y_SUPERVISOR)
  @Get('options')
  options() {
    return this.products.options();
  }

  @Roles(...ADMIN_Y_SUPERVISOR)
  @Get(':id')
  detail(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.products.detail(actor, id);
  }

  @Roles('Administrador')
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateProductDto) {
    return this.products.create(actor, dto);
  }

  @Roles('Administrador')
  @Post(':id/clone')
  clone(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloneProductDto,
  ) {
    return this.products.clone(actor, id, dto);
  }

  @Roles(...ADMIN_Y_SUPERVISOR)
  @Patch(':id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(actor, id, dto);
  }

  @Roles('Administrador')
  @Patch(':id/status')
  setStatus(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StatusProductDto,
  ) {
    return this.products.setStatus(actor, id, dto.estado);
  }

  @Roles(...ADMIN_Y_SUPERVISOR)
  @Patch(':id/quiebre')
  setQuiebre(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: QuiebreProductDto,
  ) {
    return this.products.setQuiebre(actor, id, dto);
  }
}
