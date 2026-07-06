import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EmailDeliveryLogTypeOrmEntity } from '../entities/email-delivery-log-typeorm.entity';
import type { EmailDeliveryLogRepositoryPort } from '../../domain/repositories/email-delivery-log-repository.port';

@Injectable()
export class EmailDeliveryLogTypeOrmRepository implements EmailDeliveryLogRepositoryPort {
  private readonly repository: Repository<EmailDeliveryLogTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = dataSource.getRepository(EmailDeliveryLogTypeOrmEntity);
  }

  async save(log: {
    notificationId?: string;
    recipientEmail: string;
    subject: string;
    provider: string;
    providerMessageId?: string | null;
    status: string;
    errorMessage?: string | null;
  }): Promise<void> {
    const entity = new EmailDeliveryLogTypeOrmEntity();
    entity.notificationId = log.notificationId ?? null;
    entity.recipientEmail = log.recipientEmail;
    entity.subject = log.subject;
    entity.provider = log.provider;
    entity.providerMessageId = log.providerMessageId ?? null;
    entity.status = log.status;
    entity.errorMessage = log.errorMessage ?? null;
    await this.repository.save(entity);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.update(id, { deletedAt: new Date() });
  }
}
