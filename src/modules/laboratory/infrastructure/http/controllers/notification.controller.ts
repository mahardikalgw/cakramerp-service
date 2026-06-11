import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { NotificationService } from '../../../application/services/notification.service';

@Controller('laboratory')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('notifications')
  async getMyNotifications(
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationService.findByUserId(req.user?.id ?? '', {
      unreadOnly: unreadOnly === 'true',
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('notifications/count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.notificationService.countUnread(
      req.user?.id ?? '',
    );
    return { unreadCount: count };
  }

  @Patch('notifications/:id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Patch('notifications/read-all')
  async markAllAsRead(@Req() req: any) {
    const count = await this.notificationService.markAllAsRead(
      req.user?.id ?? '',
    );
    return { markedAsRead: count };
  }
}
