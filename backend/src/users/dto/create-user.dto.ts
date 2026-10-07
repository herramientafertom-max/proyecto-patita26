import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsRut } from '../../common/is-rut.decorator';
import { AssignmentDto } from './assignment.dto';
import { PERFILES_VALIDOS } from '../perfiles';

export class CreateUserDto {
  @ApiProperty({ example: '12345678-5' })
  @IsRut()
  rut!: string;

  @ApiProperty() @IsString() @MinLength(2) nombre!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() telefono?: string;

  @ApiProperty({ enum: PERFILES_VALIDOS })
  @IsIn(PERFILES_VALIDOS)
  perfil!: string;

  @ApiPropertyOptional({ type: [AssignmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentDto)
  asignaciones?: AssignmentDto[];
}
