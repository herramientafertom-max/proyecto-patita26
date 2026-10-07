import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateFieldPhotoDto {
  @ApiProperty() @IsUUID() localId!: string;
  @ApiProperty() @IsUUID() productId!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockAlMomento?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaStockSistemico?: string;
}
