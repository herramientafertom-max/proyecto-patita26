import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class ListFieldPhotosDto {
  @ApiProperty() @IsUUID() localId!: string;
  @ApiProperty() @IsUUID() productId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(90) days = 15;
}
