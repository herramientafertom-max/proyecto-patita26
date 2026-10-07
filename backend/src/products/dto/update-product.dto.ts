import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { IsEan } from '../../common/is-ean.decorator';

export class UpdateProductDto {
  @ApiPropertyOptional({
    description:
      'Cambia la cadena del producto (crea/reutiliza la relación cadena+SAP).',
  })
  @IsOptional()
  @IsUUID()
  cadenaId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) sap?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sapPack?: string;

  @ApiPropertyOptional() @IsOptional() @IsEan() eanUnidad?: string;
  @ApiPropertyOptional() @IsOptional() @IsEan() eanPack?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unidadesPorCaja?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() nombreCadena?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() marcaTextoCadena?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  nombreHomologado?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() marcaId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() marcaNombre?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() proveedorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() proveedorNombre?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() seccionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seccionNombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioPack?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() campanaActiva?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() campanaDesde?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() campanaHasta?: string;
}
