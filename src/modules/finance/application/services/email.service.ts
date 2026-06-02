import { Injectable, Logger } from '@nestjs/common';

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Send an email notification.
   * In production, integrate with an SMTP provider (e.g., nodemailer, SendGrid, AWS SES).
   * For now, this logs the email and can be extended with actual transport.
   */
  async send(payload: EmailPayload): Promise<void> {
    // TODO: Replace with actual SMTP/email transport in production
    this.logger.log(
      `[EMAIL] To: ${payload.to} | Subject: ${payload.subject} | Body: ${payload.body.substring(0, 100)}...`,
    );
  }

  async sendAlertNotification(alert: {
    type: string;
    message: string;
    severity: string;
    relatedUrl?: string;
  }): Promise<void> {
    const subject = `[CakramERP Alert - ${alert.severity.toUpperCase()}] ${alert.type.replace(/_/g, ' ')}`;
    const body = `
KPI Alert Notification
======================

Type: ${alert.type.replace(/_/g, ' ')}
Severity: ${alert.severity}
Message: ${alert.message}

${alert.relatedUrl ? `View details: ${alert.relatedUrl}` : ''}

---
This is an automated notification from CakramERP.
    `.trim();

    // In production, fetch director email from user/settings table
    const directorEmail =
      process.env.ALERT_NOTIFICATION_EMAIL || 'director@company.com';

    await this.send({
      to: directorEmail,
      subject,
      body,
    });
  }
}
