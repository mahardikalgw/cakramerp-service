import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  Inject,
  Req,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import type { AuthServicePort } from '../../../application/ports/auth-service.port';
import { AUTH_SERVICE } from '../../../application/ports/auth-service.port';
import type { UserRepositoryPort } from '../../../../user/domain/repositories/user-repository.port';
import { USER_REPOSITORY } from '../../../../user/domain/repositories/user-repository.port';
import { LoginCommand } from '../../../application/commands/login.command';
import { RegisterCommand } from '../../../application/commands/register.command';
import { LoginHttpDto } from '../dtos/login.dto';
import { RegisterHttpDto } from '../dtos/register.dto';
import { TokenResponseDto } from '../dtos/token-response.dto';
import { JwtRefreshGuard } from '../../guards/jwt-refresh.guard';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE)
    private readonly authService: AuthServicePort,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  async register(
    @Body() dto: RegisterHttpDto,
    @Req() req: any,
  ): Promise<TokenResponseDto> {
    const command = new RegisterCommand(
      dto.email,
      dto.password,
      dto.firstName,
      dto.lastName,
    );
    const result = await this.authService.register(command);
    return TokenResponseDto.fromResult(result);
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  async login(
    @Body() dto: LoginHttpDto,
    @Req() req: any,
  ): Promise<TokenResponseDto> {
    const ipAddress = req.ip ?? req.connection?.remoteAddress;
    const command = new LoginCommand(dto.email, dto.password, ipAddress);
    const result = await this.authService.login(command);
    return TokenResponseDto.fromResult(result);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(200)
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Req() req: any,
  ): Promise<TokenResponseDto> {
    const ipAddress = req.ip ?? req.connection?.remoteAddress;
    const userAgent = req.headers?.['user-agent'];
    const result = await this.authService.refresh(refreshToken, {
      ipAddress,
      userAgent,
    });
    return TokenResponseDto.fromResult(result);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body('refreshToken') refreshToken: string): Promise<void> {
    return this.authService.logout(refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: any) {
    const userId = user.sub ?? user.id;
    const fullUser = await this.userRepository.findById(userId);
    if (!fullUser) {
      return null;
    }
    return {
      id: fullUser.id,
      email: fullUser.email,
      firstName: fullUser.firstName,
      lastName: fullUser.lastName,
      roles: fullUser.roles ?? [],
      permissions: fullUser.permissions ?? [],
    };
  }
}
