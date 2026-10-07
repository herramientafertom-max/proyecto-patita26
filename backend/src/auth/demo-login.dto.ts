import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { PERFILES_VALIDOS } from '../users/perfiles';

export class DemoLoginDto {
  @ApiProperty({ example: 'local-demo-password' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ enum: PERFILES_VALIDOS, default: 'Administrador' })
  @IsOptional()
  @IsIn(PERFILES_VALIDOS)
  role?: string;
}
