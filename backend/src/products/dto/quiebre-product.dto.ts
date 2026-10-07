import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class QuiebreProductDto {
  @ApiProperty({ description: 'true declara quiebre, false lo revierte.' })
  @IsBoolean()
  quiebreActivo!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'Si es true y el artículo tiene un EAN válido (>= 8 dígitos), aplica el mismo cambio a todos los productos de la empresa que comparten ese EAN.',
  })
  @IsOptional()
  @IsBoolean()
  propagarPorEan?: boolean;
}
