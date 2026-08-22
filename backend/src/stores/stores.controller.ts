import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth-user';
import type { AuthUser } from '../auth/auth-user';
import { HistoryQueryDto } from './history-query.dto';
import { ListQueryDto } from './list-query.dto';
import { StoresService } from './stores.service';

@ApiTags('stores')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('stores')
export class StoresController {
  constructor(private readonly stores: StoresService) {}
  @Get() list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.stores.list(user, query);
  }
  @Get(':id/products') products(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListQueryDto,
  ) {
    return this.stores.products(user, id, query);
  }

  @Get(':id/products/:productId/history')
  history(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: HistoryQueryDto,
  ) {
    return this.stores.history(user, id, productId, query.days);
  }
}
