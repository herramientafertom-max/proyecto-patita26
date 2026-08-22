import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DemoLoginDto {
  @ApiProperty({ example: 'local-demo-password' })
  @IsString()
  @MinLength(8)
  password!: string;
}
