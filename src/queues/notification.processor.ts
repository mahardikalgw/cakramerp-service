import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { NOTIFICATION_QUEUE_NAME } from './audit-log.constants';

export interface NotificationJobData {
  to: string;
  subject: string;
  body: string;
  type: 'email' | 'alert';
}

@Processor(NOTIFICATION_QUEUE_NAME)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: { data: NotificationJobData }): Promise<void> {
    const data = job.data;
    this.logger.debug(`Dispatching ${data.type}: ${data.subject}`);
    if (data.type === 'email') {
      this.logger.log(
        `[EMAIL via queue] To: ${data.to} | Subject: ${data.subject}`,
      );
    } else {
      this.logger.warn(
        `[ALERT via queue] ${data.subject} | ${data.body.slice(0, 120)}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}
