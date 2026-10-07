import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsRut } from '../../common/is-rut.decorator';
import { AssignmentDto } from './assignment.dto';
import { ESTADOS_VALIDOS, PERFILES_VALIDOS } from '../perfiles';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() telefono?: string;

  @ApiPropertyOptional({ example: '12345678-5' })
  @IsOptional()
  @IsRut()
  rut?: string;

  @ApiPropertyOptional({ enum: PERFILES_VALIDOS })
  @IsOptional()
  @IsIn(PERFILES_VALIDOS)
  perfil?: string;

  @ApiPropertyOptional({ enum: ESTADOS_VALIDOS })
  @IsOptional()
  @IsIn(ESTADOS_VALIDOS)
  estado?: string;

  /** UUID de auth.users a vincular, o null para desvincular. Omitir para no tocarlo. */
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  authUserId?: string | null;

  @ApiPropertyOptional({ type: [AssignmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentDto)
  asignaciones?: AssignmentDto[];
}
