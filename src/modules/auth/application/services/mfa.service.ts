import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { UserTypeOrmEntity } from '../../../user/infrastructure/entities/user-typeorm.entity';

export interface MfaSecretResult {
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

@Injectable()
export class MfaService {
  private static readonly ISSUER = 'CakramERP';
  private static readonly BACKUP_CODE_COUNT = 10;

  constructor(
    @InjectRepository(UserTypeOrmEntity)
    private readonly userRepo: Repository<UserTypeOrmEntity>,
  ) {}

  async generateSecret(email: string): Promise<MfaSecretResult> {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, MfaService.ISSUER, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);
    const backupCodes = this.generateBackupCodes();
    return { secret, qrCodeDataUrl, backupCodes };
  }

  async verifyCode(secret: string, token: string): Promise<boolean> {
    try {
      return authenticator.verify({ token, secret });
    } catch {
      return false;
    }
  }

  async enableMfa(
    userId: string,
    secret: string,
    token: string,
    backupCodes: string[],
  ): Promise<void> {
    const isValid = await this.verifyCode(secret, token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }
    await this.userRepo.update(userId, {
      mfaSecret: secret,
      mfaEnabled: true,
      mfaBackupCodes: JSON.stringify(backupCodes),
      mfaEnabledAt: new Date(),
    });
  }

  async disableMfa(userId: string): Promise<void> {
    await this.userRepo.update(userId, {
      mfaSecret: null,
      mfaEnabled: false,
      mfaBackupCodes: null,
      mfaEnabledAt: null,
    });
  }

  async validateBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.mfaBackupCodes) return false;

    const codes: string[] = JSON.parse(user.mfaBackupCodes);
    const idx = codes.indexOf(code);
    if (idx === -1) return false;

    codes.splice(idx, 1);
    await this.userRepo.update(userId, {
      mfaBackupCodes: JSON.stringify(codes),
    });
    return true;
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < MfaService.BACKUP_CODE_COUNT; i++) {
      const code = Array.from({ length: 4 }, () =>
        Math.random().toString(36).substring(2, 4).toUpperCase(),
      ).join('-');
      codes.push(code);
    }
    return codes;
  }
}
