import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ESTADOS_PRODUCTO_VALIDOS } from '../estados';

export class StatusProductDto {
  @ApiProperty({ enum: ESTADOS_PRODUCTO_VALIDOS })
  @IsIn(ESTADOS_PRODUCTO_VALIDOS)
  estado!: string;
}
