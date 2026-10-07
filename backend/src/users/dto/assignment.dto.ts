import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsUUID, ValidateNested } from 'class-validator';

export class AssignmentDaysDto {
  @ApiProperty({ default: false }) @IsBoolean() lunes = false;
  @ApiProperty({ default: false }) @IsBoolean() martes = false;
  @ApiProperty({ default: false }) @IsBoolean() miercoles = false;
  @ApiProperty({ default: false }) @IsBoolean() jueves = false;
  @ApiProperty({ default: false }) @IsBoolean() viernes = false;
  @ApiProperty({ default: false }) @IsBoolean() sabado = false;
  @ApiProperty({ default: false }) @IsBoolean() domingo = false;
}

export class AssignmentDto {
  @ApiProperty() @IsUUID() localId!: string;
  @ApiProperty({ type: AssignmentDaysDto })
  @ValidateNested()
  @Type(() => AssignmentDaysDto)
  dias!: AssignmentDaysDto;
}
