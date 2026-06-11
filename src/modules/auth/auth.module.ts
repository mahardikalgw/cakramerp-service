import { Module, forwardRef } from '@nestjs/common';
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
import { IAMModule } from '../iam/iam.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRATION || '7d') as any,
      },
    }),
    TypeOrmModule.forFeature([RefreshTokenTypeOrmEntity]),
    UserModule,
    forwardRef(() => IAMModule),
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
