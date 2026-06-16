import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { NotificationService } from '../../../application/services/notification.service';
import { NotificationEventService } from '../../../application/services/notification-event.service';
import type { DeviceTokenRepositoryPort } from '../../../domain/repositories/device-token-repository.port';
import { DEVICE_TOKEN_REPOSITORY } from '../../../domain/repositories/device-token-repository.port';
import { Inject } from '@nestjs/common';
import { DeviceToken } from '../../../domain/entities/device-token.entity';
import { RegisterDeviceTokenDto } from '../dtos/notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationEventService: NotificationEventService,
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokenRepo: DeviceTokenRepositoryPort,
  ) {}

  @Get()
  async getMyNotifications(
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationService.findByRecipientUserId(req.user?.id ?? '', {
      unreadOnly: unreadOnly === 'true',
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.notificationService.countUnread(
      req.user?.id ?? '',
    );
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const success = await this.notificationService.markAsReadByIdAndRecipient(
      id,
      req.user?.id ?? '',
    );
    return { success };
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const count = await this.notificationService.markAllAsRead(
      req.user?.id ?? '',
    );
    return { markedAsRead: count };
  }

  @Post('device-token')
  async registerDeviceToken(
    @Req() req: any,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    const existing = await this.deviceTokenRepo.findByToken(dto.token);
    if (existing) {
      if (existing.userId !== req.user?.id) {
        existing.userId = req.user?.id;
        existing.platform = dto.platform as 'ios' | 'android';
        existing.deviceName = dto.deviceName ?? null;
        existing.appVersion = dto.appVersion ?? null;
        existing.osVersion = dto.osVersion ?? null;
        existing.isActive = true;
        existing.invalidatedAt = null;
        await this.deviceTokenRepo.save(existing);
      }
      return existing;
    }

    const deviceToken = new DeviceToken({
      userId: req.user?.id,
      platform: dto.platform as 'ios' | 'android',
      token: dto.token,
      deviceName: dto.deviceName ?? null,
      appVersion: dto.appVersion ?? null,
      osVersion: dto.osVersion ?? null,
      isActive: true,
    });
    return this.deviceTokenRepo.save(deviceToken);
  }

  @Delete('device-token/:id')
  async unregisterDeviceToken(@Param('id') id: string, @Req() req: any) {
    const token = await this.deviceTokenRepo.findById(id);
    if (!token || token.userId !== req.user?.id) {
      return { success: false };
    }
    await this.deviceTokenRepo.invalidateToken(id);
    return { success: true };
  }
}
