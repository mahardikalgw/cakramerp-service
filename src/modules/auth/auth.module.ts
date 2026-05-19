import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './application/services/auth.service';
import { AuthController } from './infrastructure/http/controllers/auth.controller';
import { AuthTypeOrmRepository } from './infrastructure/repositories/auth-typeorm.repository';
import { RefreshTokenTypeOrmEntity } from './infrastructure/entities/refresh-token-typeorm.entity';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { JwtRefreshStrategy } from './infrastructure/strategies/jwt-refresh.strategy';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { JwtRefreshGuard } from './infrastructure/guards/jwt-refresh.guard';
import { AUTH_REPOSITORY } from './domain/repositories/auth-repository.port';
import { AUTH_SERVICE } from './application/ports/auth-service.port';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([RefreshTokenTypeOrmEntity]),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
    JwtRefreshGuard,
    {
      provide: AUTH_SERVICE,
      useClass: AuthService,
    },
    {
      provide: AUTH_REPOSITORY,
      useClass: AuthTypeOrmRepository,
    },
  ],
  exports: [AUTH_SERVICE, JwtAuthGuard, JwtRefreshGuard],
})
export class AuthModule {}
