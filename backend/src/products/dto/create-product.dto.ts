import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { IsEan } from '../../common/is-ean.decorator';
import { ESTADOS_PRODUCTO_VALIDOS } from '../estados';

export class CreateProductDto {
  @ApiProperty() @IsUUID() cadenaId!: string;

  @ApiProperty() @IsString() @MinLength(1) sap!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sapPack?: string;

  @ApiPropertyOptional() @IsOptional() @IsEan() eanUnidad?: string;
  @ApiPropertyOptional() @IsOptional() @IsEan() eanPack?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unidadesPorCaja?: number;

  @ApiPropertyOptional({
    description: 'Nombre del producto tal como lo expone la cadena.',
  })
  @IsOptional()
  @IsString()
  nombreCadena?: string;

  @ApiPropertyOptional({ description: 'Marca tal como la expone la cadena.' })
  @IsOptional()
  @IsString()
  marcaTextoCadena?: string;

  @ApiProperty({ description: 'Nombre homologado del producto.' })
  @IsString()
  @MinLength(1)
  nombreHomologado!: string;

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

  @ApiPropertyOptional({ enum: ESTADOS_PRODUCTO_VALIDOS, default: 'Activo' })
  @IsOptional()
  @IsIn(ESTADOS_PRODUCTO_VALIDOS)
  estado?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  campanaActiva?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsDateString() campanaDesde?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() campanaHasta?: string;
}
