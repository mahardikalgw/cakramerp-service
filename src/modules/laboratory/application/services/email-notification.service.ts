import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailNotificationService {
  private readonly resendApiKey: string;
  private readonly fromEmail: string;
  private readonly appBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.resendApiKey = this.configService.get('RESEND_API_KEY') || '';
    this.fromEmail = this.configService.get('RESEND_FROM_EMAIL') || 'noreply@cakramerp.id';
    this.appBaseUrl = this.configService.get('APP_BASE_URL') || 'http://localhost:3000';
  }

  async sendEmail(to: string, subject: string, html: string): Promise<{
    messageId: string | null;
    status: 'sent' | 'failed';
    error?: string;
  }> {
    if (!this.resendApiKey) {
      return { messageId: null, status: 'failed', error: 'RESEND_API_KEY not configured' };
    }

    try {
      const { Resend } = await import('resend');
      const resend = new Resend(this.resendApiKey);
      const result = await resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });

      if (result.error) {
        return { messageId: null, status: 'failed', error: result.error.message };
      }

      return { messageId: (result.data as any)?.id ?? null, status: 'sent' };
    } catch (err: any) {
      return { messageId: null, status: 'failed', error: err?.message };
    }
  }

  buildTestingRequestSubmittedHtml(data: {
    requestNumber: string;
    projectName: string;
    customerName: string;
    submittedAt: string;
  }): string {
    const actionUrl = `${this.appBaseUrl}/laboratory/testing-requests`;
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
        <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
          <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px;">New Testing Request</h1>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">A new testing request has been submitted.</p>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Request Number</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.requestNumber}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Project Name</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.projectName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Customer</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.customerName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Submitted At</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.submittedAt}</td></tr>
          </table>
          <div style="margin-top: 24px;">
            <a href="${actionUrl}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">View Request</a>
          </div>
        </div>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 16px; text-align: center;">Cakra ERP Laboratory &mdash; Notification</p>
      </div>
    `;
  }

  buildTestingRequestApprovedHtml(data: {
    requestNumber: string;
    projectName: string;
    orderDate: string;
    totalAmount: string;
    actionUrl: string;
  }): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
        <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
          <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px;">Testing Request Approved</h1>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">Your testing request has been approved and is ready for scheduling.</p>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Request Number</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.requestNumber}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Project Name</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.projectName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Order Date</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.orderDate}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Total Amount</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.totalAmount}</td></tr>
          </table>
          <div style="margin-top: 24px;">
            <a href="${data.actionUrl}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">View Documents</a>
          </div>
        </div>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 16px; text-align: center;">Cakra ERP Laboratory &mdash; Notification</p>
      </div>
    `;
  }

  buildScheduleCompletedHtml(data: {
    scheduleId: string;
    scheduledDate: string;
    location: string;
    totalUnits: number;
    results: Array<{ serviceName: string; sampleCode: string; status: string }>;
    actionUrl: string;
  }): string {
    const rows = data.results.map(r => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #111827;">${r.serviceName}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #111827;">${r.sampleCode}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: ${r.status === 'confirmed' ? '#059669' : '#6b7280'}; text-transform: capitalize;">${r.status}</td>
      </tr>
    `).join('');

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
        <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
          <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px;">Schedule Completed</h1>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">All ${data.totalUnits} tests from your schedule have been confirmed.</p>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Date</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.scheduledDate}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Location</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.location}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Total Units</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.totalUnits}</td></tr>
          </table>
          <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin: 20px 0 8px;">Results Summary</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 500;">Service</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 500;">Sample</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 500;">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="margin-top: 24px;">
            <a href="${data.actionUrl}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">View Results</a>
          </div>
        </div>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 16px; text-align: center;">Cakra ERP Laboratory &mdash; Notification</p>
      </div>
    `;
  }

  buildContractReadyForSigningHtml(data: {
    contractNumber: string;
    projectName: string;
    actionUrl: string;
  }): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
        <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
          <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px;">Contract Ready for Signing</h1>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">Your contract is ready. Please download, sign, and upload within 7 days.</p>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Contract Number</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.contractNumber}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Project Name</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.projectName}</td></tr>
          </table>
          <div style="margin-top: 24px;">
            <a href="${data.actionUrl}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">View & Sign</a>
          </div>
        </div>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 16px; text-align: center;">Cakra ERP Laboratory &mdash; Notification</p>
      </div>
    `;
  }

  buildSignedContractUploadedHtml(data: {
    requestNumber: string;
    projectName: string;
    actionUrl: string;
  }): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
        <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
          <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px;">Signed Contract Uploaded</h1>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">A signed contract has been uploaded and requires your review.</p>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Request Number</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.requestNumber}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Project Name</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.projectName}</td></tr>
          </table>
          <div style="margin-top: 24px;">
            <a href="${data.actionUrl}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">Review Contract</a>
          </div>
        </div>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 16px; text-align: center;">Cakra ERP Laboratory &mdash; Notification</p>
      </div>
    `;
  }

  buildContractConfirmedHtml(data: {
    requestNumber: string;
    projectName: string;
    actionUrl: string;
  }): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
        <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
          <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px;">Contract Activated</h1>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">Your contract has been confirmed and is now active with unlimited samples.</p>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Request Number</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.requestNumber}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Project Name</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.projectName}</td></tr>
          </table>
          <div style="margin-top: 24px;">
            <a href="${data.actionUrl}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">View Request</a>
          </div>
        </div>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 16px; text-align: center;">Cakra ERP Laboratory &mdash; Notification</p>
      </div>
    `;
  }

  buildContractSigningExpiredHtml(data: {
    requestNumber: string;
    projectName: string;
    actionUrl: string;
  }): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
        <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
          <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px;">Contract Signing Expired</h1>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">The 7-day signing period has passed. Your contract request has been cancelled. Please submit a new request to proceed.</p>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Request Number</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.requestNumber}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Project Name</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.projectName}</td></tr>
          </table>
          <div style="margin-top: 24px;">
            <a href="${data.actionUrl}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">View Request</a>
          </div>
        </div>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 16px; text-align: center;">Cakra ERP Laboratory &mdash; Notification</p>
      </div>
    `;
  }

  buildMonthlyInvoiceGeneratedHtml(data: {
    invoiceNumber: string;
    billingPeriod: string;
    totalAmount: string;
    actionUrl: string;
  }): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
        <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
          <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px;">Monthly Invoice Generated</h1>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">Your monthly invoice is ready for viewing and download.</p>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Invoice Number</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.invoiceNumber}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Billing Period</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.billingPeriod}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Total Amount</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.totalAmount}</td></tr>
          </table>
          <div style="margin-top: 24px;">
            <a href="${data.actionUrl}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">View Invoice</a>
          </div>
        </div>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 16px; text-align: center;">Cakra ERP Laboratory &mdash; Notification</p>
      </div>
    `;
  }

  buildContractGeneratedHtml(data: {
    contractNumber: string;
    projectName: string;
    totalQuota: number;
    actionUrl: string;
  }): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
        <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
          <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px;">Lab Contract Generated</h1>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">Your lab contract has been generated and is ready for scheduling.</p>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Contract Number</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.contractNumber}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Project Name</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.projectName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Sample Quota</td><td style="padding: 8px 0; color: #111827; font-weight: 500;">${data.totalQuota} samples</td></tr>
          </table>
          <div style="margin-top: 24px;">
            <a href="${data.actionUrl}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">View Contract</a>
          </div>
        </div>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 16px; text-align: center;">Cakra ERP Laboratory &mdash; Notification</p>
      </div>
    `;
  }
}
