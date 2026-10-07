import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ESTADOS_VALIDOS, PERFILES_VALIDOS } from '../perfiles';

export class ListUsersQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search = '';

  @ApiPropertyOptional({ enum: PERFILES_VALIDOS })
  @IsOptional()
  @IsIn(PERFILES_VALIDOS)
  perfil?: string;

  @ApiPropertyOptional({ enum: ESTADOS_VALIDOS })
  @IsOptional()
  @IsIn(ESTADOS_VALIDOS)
  estado?: string;

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
