import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './auth-user';
import type { AuthUser } from './auth-user';
import { DemoLoginDto } from './demo-login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('demo') demo(@Body() input: DemoLoginDto) {
    return this.auth.demoLogin(input.password);
  }
  @Get('me') @ApiBearerAuth() @UseGuards(AuthGuard) me(
    @CurrentUser() user: AuthUser,
  ) {
    return user;
  }
}
