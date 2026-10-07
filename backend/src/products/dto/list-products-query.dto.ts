import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ESTADOS_PRODUCTO_VALIDOS } from '../estados';

export class ListProductsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search = '';

  @ApiPropertyOptional() @IsOptional() @IsUUID() cadenaId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() seccionId?: string;

  @ApiPropertyOptional({ enum: ESTADOS_PRODUCTO_VALIDOS })
  @IsOptional()
  @IsIn(ESTADOS_PRODUCTO_VALIDOS)
  estado?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  campanaActiva?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  quiebreActivo?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}
