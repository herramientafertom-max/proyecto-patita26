import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CloneProductDto {
  @ApiProperty({
    description: 'Nuevo SAP de unidad, obligatorio y distinto del original.',
  })
  @IsString()
  @MinLength(1)
  sap!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() sapPack?: string;

  @ApiPropertyOptional({
    description:
      'Cadena destino del clon. Por defecto, la misma del producto original.',
  })
  @IsOptional()
  @IsUUID()
  cadenaId?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'Si es true, el clon reutiliza el mismo artículo (y por lo tanto el mismo EAN) del original.',
  })
  @IsOptional()
  @IsBoolean()
  copiarEan?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  copiarCampana?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  copiarImagenes?: boolean;
}
