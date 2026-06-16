import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  Req,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { MfaService } from '../../../application/services/mfa.service';

@Controller('auth/mfa')
@UseGuards(JwtAuthGuard)
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Post('setup')
  async setup(@Req() req: any) {
    const userId = req.user.sub ?? req.user.id;
    const email = req.user.email;
    const result = await this.mfaService.generateSecret(email);
    return {
      secret: result.secret,
      qrCode: result.qrCodeDataUrl,
      backupCodes: result.backupCodes,
    };
  }

  @Post('verify')
  @HttpCode(200)
  async verify(
    @Body('secret') secret: string,
    @Body('token') token: string,
    @Body('backupCodes') backupCodes: string[],
    @Req() req: any,
  ) {
    const userId = req.user.sub ?? req.user.id;
    await this.mfaService.enableMfa(userId, secret, token, backupCodes);
    return { enabled: true };
  }

  @Post('disable')
  @HttpCode(200)
  async disable(@Req() req: any) {
    const userId = req.user.sub ?? req.user.id;
    await this.mfaService.disableMfa(userId);
    return { enabled: false };
  }

  @Post('validate')
  @HttpCode(200)
  async validate(@Body('token') token: string, @Req() req: any) {
    const userId = req.user.sub ?? req.user.id;
    const user = await req.user;
    if (!user?.mfaSecret) {
      return { valid: false, reason: 'MFA not configured' };
    }
    const valid = await this.mfaService.verifyCode(user.mfaSecret, token);
    return { valid };
  }

  @Post('validate-backup-code')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async validateBackupCode(@Body('code') code: string, @Req() req: any) {
    const userId = req.user.sub ?? req.user.id;
    const valid = await this.mfaService.validateBackupCode(userId, code);
    return { valid };
  }
}