import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) return { statusCode: 401, message: 'Invalid credentials' };
    return this.authService.login(user);
  }

  @Get('seed')
  async seed() {
    await this.authService.seedAdmin();
    return { message: 'Seeded' };
  }
}
