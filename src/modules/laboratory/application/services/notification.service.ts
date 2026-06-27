import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  Notification,
  NotificationEventType,
} from '../../domain/entities/notification.entity';
import type { NotificationRepositoryPort } from '../../domain/repositories/notification-repository.port';
import { NOTIFICATION_REPOSITORY } from '../../domain/repositories/notification-repository.port';
import type { DeviceTokenRepositoryPort } from '../../domain/repositories/device-token-repository.port';
import { DEVICE_TOKEN_REPOSITORY } from '../../domain/repositories/device-token-repository.port';
import type { EmailDeliveryLogRepositoryPort } from '../../domain/repositories/email-delivery-log-repository.port';
import { EMAIL_DELIVERY_LOG_REPOSITORY } from '../../domain/repositories/email-delivery-log-repository.port';
import { EmailNotificationService } from './email-notification.service';
import { PushNotificationService } from './push-notification.service';

export interface DispatchInput {
  recipientUserId: string;
  recipientEmail?: string;
  eventType: NotificationEventType | string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  entityType?: string;
  entityId?: string;
  channels: {
    email?: { subject: string; html: string };
    push?: { title: string; body: string; data?: Record<string, string> };
    inApp?: boolean;
  };
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: NotificationRepositoryPort,
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokenRepo: DeviceTokenRepositoryPort,
    @Inject(EMAIL_DELIVERY_LOG_REPOSITORY)
    private readonly emailLogRepo: EmailDeliveryLogRepositoryPort,
    private readonly emailService: EmailNotificationService,
    private readonly pushService: PushNotificationService,
  ) {}

  async dispatch(input: DispatchInput): Promise<Notification> {
    const notification = new Notification({
      recipientUserId: input.recipientUserId,
      eventType: input.eventType,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl ?? null,
      actionLabel: input.actionLabel ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      emailSent: false,
      pushSent: false,
      isRead: false,
    });

    const saved = await this.notificationRepo.save(notification);

    const update: Partial<Notification> = {};

    if (input.channels.email && input.recipientEmail) {
      const result = await this.emailService.sendEmail(
        input.recipientEmail,
        input.channels.email.subject,
        input.channels.email.html,
      );
      update.emailSent = result.status === 'sent';
      update.emailSentAt = result.status === 'sent' ? new Date() : null;

      try {
        await this.emailLogRepo.save({
          notificationId: saved.id,
          recipientEmail: input.recipientEmail,
          subject: input.channels.email.subject,
          provider: 'resend',
          providerMessageId: result.messageId,
          status: result.status,
          errorMessage: result.error,
        });
      } catch {
        /* ignore */
      }
    }

    if (input.channels.push) {
      try {
        const tokens = await this.deviceTokenRepo.findActiveByUserId(
          input.recipientUserId,
        );
        if (tokens.length > 0) {
          const unreadCount =
            (await this.notificationRepo.countUnreadByRecipientUserId(
              input.recipientUserId,
            )) + 1;
          const result = await this.pushService.sendPush(
            tokens.map((t) => ({
              id: t.id!,
              platform: t.platform as 'ios' | 'android',
              token: t.token,
            })),
            { ...input.channels.push, badge: unreadCount },
          );
          update.pushSent = result.sent > 0;
          update.pushSentAt = result.sent > 0 ? new Date() : null;
          update.pushError =
            result.errors.length > 0 ? result.errors.join('; ') : null;

          for (const tokenId of result.invalidTokenIds) {
            try {
              await this.deviceTokenRepo.invalidateToken(tokenId);
            } catch {
              /* ignore */
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `Push dispatch failed for user ${input.recipientUserId}: ${err?.message}`,
        );
      }
    }

    if (Object.keys(update).length > 0) {
      Object.assign(saved, update);
      try {
        await this.notificationRepo.save(saved);
      } catch {
        /* ignore */
      }
    }

    return saved;
  }

  async dispatchMany(
    recipients: Array<{ userId: string; email?: string }>,
    builder: (recipient: { userId: string; email?: string }) => DispatchInput,
  ): Promise<void> {
    await Promise.allSettled(
      recipients.map((r) =>
        this.dispatch(builder(r)).catch((err) => {
          this.logger.error(
            `Notification dispatch failed for user ${r.userId}: ${err?.message}`,
          );
        }),
      ),
    );
  }

  async findByRecipientUserId(
    recipientUserId: string,
    options?: { unreadOnly?: boolean; page?: number; limit?: number },
  ) {
    return this.notificationRepo.findByRecipientUserId(
      recipientUserId,
      options,
    );
  }

  async countUnread(recipientUserId: string): Promise<number> {
    return this.notificationRepo.countUnreadByRecipientUserId(recipientUserId);
  }

  async markAsRead(id: string): Promise<Notification | null> {
    return this.notificationRepo.markAsRead(id);
  }

  async markAsReadByIdAndRecipient(
    id: string,
    recipientUserId: string,
  ): Promise<boolean> {
    return this.notificationRepo.markAsReadByIdAndRecipient(
      id,
      recipientUserId,
    );
  }

  async markAllAsRead(recipientUserId: string): Promise<number> {
    return this.notificationRepo.markAllAsRead(recipientUserId);
  }

  send(dto: {
    userId: string;
    type: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
  }): Promise<Notification> {
    return this.dispatch({
      recipientUserId: dto.userId,
      eventType: dto.type,
      title: dto.title,
      message: dto.message,
      entityType: dto.entityType,
      entityId: dto.entityId,
      channels: { inApp: true },
    });
  }
}
