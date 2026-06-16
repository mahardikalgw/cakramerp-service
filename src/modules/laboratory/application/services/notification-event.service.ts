import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { EmailNotificationService } from './email-notification.service';
import type { UserRepositoryPort } from '../../../user/domain/repositories/user-repository.port';
import { USER_REPOSITORY } from '../../../user/domain/repositories/user-repository.port';
import type { CustomerRepositoryPort } from '../../../customer/domain/repositories/customer-repository.port';
import { CUSTOMER_REPOSITORY } from '../../../customer/domain/repositories/customer-repository.port';
import { TestingRequest } from '../../domain/entities/testing-request.entity';
import { Customer } from '../../../customer/domain/entities/customer.entity';
import { PostApprovalTestingSchedule } from '../../domain/entities/post-approval-testing-schedule.entity';
import { PostApprovalTestingResult } from '../../domain/entities/post-approval-testing-result.entity';
import { PostApprovalLabContract } from '../../domain/entities/post-approval-lab-contract.entity';

@Injectable()
export class NotificationEventService {
  private readonly logger = new Logger(NotificationEventService.name);
  private readonly appBaseUrl: string;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailNotificationService,
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepositoryPort,
    @Inject(CUSTOMER_REPOSITORY) private readonly customerRepo: CustomerRepositoryPort,
    private readonly configService: ConfigService,
  ) {
    this.appBaseUrl = this.configService.get('APP_BASE_URL') || 'http://localhost:3000';
  }

  async onTestingRequestSubmitted(request: TestingRequest, customer: Customer): Promise<void> {
    try {
      const admins = await this.userRepo.findAll({
        filters: { role: 'admin' },
        limit: 100,
      });
      const requestUrl = `${this.appBaseUrl}/laboratory/testing-requests/${request.id}`;

      await this.notificationService.dispatchMany(
        admins.data.map(a => ({ userId: a.id!, email: a.email })),
        (admin) => ({
          recipientUserId: admin.userId,
          recipientEmail: admin.email,
          eventType: 'testing_request_submitted',
          title: `New Testing Request: ${request.requestNumber}`,
          message: `${customer.name} submitted a new testing request for "${request.projectName}".`,
          actionUrl: requestUrl,
          actionLabel: 'View Request',
          entityType: 'testing_request',
          entityId: request.id,
          channels: {
            email: {
              subject: `New Testing Request — ${request.requestNumber}`,
              html: this.emailService.buildTestingRequestSubmittedHtml({
                requestNumber: request.requestNumber,
                projectName: request.projectName,
                customerName: customer.name,
                submittedAt: request.createdAt instanceof Date
                  ? request.createdAt.toISOString()
                  : String(request.createdAt ?? new Date().toISOString()),
              }),
            },
            push: {
              title: 'New Testing Request',
              body: `${customer.name} submitted ${request.requestNumber}`,
              data: { screen: 'testing_request_detail', entityId: request.id },
            },
            inApp: true,
          },
        }),
      );
    } catch (err: any) {
      this.logger.error(`onTestingRequestSubmitted failed: ${err?.message}`);
    }
  }

  async onTestingRequestApproved(request: TestingRequest, customerUserId: string): Promise<void> {
    try {
      const customerEmail = await this.resolveCustomerEmail(customerUserId);
      const portalUrl = `${this.appBaseUrl}/portal/lab/requests/${request.id}`;

      await this.notificationService.dispatch({
        recipientUserId: customerUserId,
        recipientEmail: customerEmail,
        eventType: 'testing_request_approved',
        title: `Testing Request Approved — ${request.requestNumber}`,
        message: `Your testing request "${request.projectName}" has been approved. View your documents and schedule a test.`,
        actionUrl: portalUrl,
        actionLabel: 'View Request',
        entityType: 'testing_request',
        entityId: request.id,
        channels: {
          email: {
            subject: `Your Testing Request is Approved — ${request.requestNumber}`,
            html: this.emailService.buildTestingRequestApprovedHtml({
              requestNumber: request.requestNumber,
              projectName: request.projectName,
              orderDate: new Date().toISOString().split('T')[0],
              totalAmount: '0',
              actionUrl: portalUrl,
            }),
          },
          push: {
            title: 'Testing Request Approved',
            body: `Your request ${request.requestNumber} has been approved`,
            data: { screen: 'request_detail', entityId: request.id },
          },
          inApp: true,
        },
      });
    } catch (err: any) {
      this.logger.error(`onTestingRequestApproved failed: ${err?.message}`);
    }
  }

  async onScheduleConfirmed(schedule: PostApprovalTestingSchedule): Promise<void> {
    try {
      if (!schedule.laboranId) return;

      const laboran = await this.userRepo.findById(schedule.laboranId);
      if (!laboran) return;

      const scheduleUrl = `${this.appBaseUrl}/laboratory/post-approval/schedules/${schedule.id}`;

      await this.notificationService.dispatch({
        recipientUserId: schedule.laboranId,
        recipientEmail: laboran.email,
        eventType: 'schedule_confirmed',
        title: `New Schedule Assignment — ${schedule.scheduledDate}`,
        message: `You've been assigned to a testing schedule on ${schedule.scheduledDate}${schedule.scheduledTime ? ` at ${schedule.scheduledTime}` : ''}${schedule.scheduledLocation ? ` at ${schedule.scheduledLocation}` : ''}.`,
        actionUrl: scheduleUrl,
        actionLabel: 'View Schedule',
        entityType: 'schedule',
        entityId: schedule.id,
        channels: {
          push: {
            title: 'New Schedule Assignment',
            body: `${schedule.scheduledDate} — ${schedule.qtySamples} samples`,
            data: { screen: 'schedule_detail', entityId: schedule.id },
          },
          inApp: true,
        },
      });
    } catch (err: any) {
      this.logger.error(`onScheduleConfirmed failed: ${err?.message}`);
    }
  }

  async onScheduleCompleted(
    schedule: PostApprovalTestingSchedule,
    contract: PostApprovalLabContract,
  ): Promise<void> {
    try {
      const customerUserId = await this.resolveCustomerUserId(contract.customerId);
      if (!customerUserId) return;
      const customerEmail = await this.resolveCustomerEmail(customerUserId);
      const portalUrl = `${this.appBaseUrl}/portal/lab/schedules/${schedule.id}`;

      await this.notificationService.dispatch({
        recipientUserId: customerUserId,
        recipientEmail: customerEmail,
        eventType: 'schedule_completed',
        title: `Schedule Completed — ${schedule.scheduledDate}`,
        message: `All ${schedule.qtySamples} tests from your schedule on ${schedule.scheduledDate} have been confirmed. View your results.`,
        actionUrl: portalUrl,
        actionLabel: 'View Results',
        entityType: 'schedule',
        entityId: schedule.id,
        channels: {
          email: {
            subject: `Testing Schedule Completed — ${schedule.scheduledDate}`,
            html: this.emailService.buildScheduleCompletedHtml({
              scheduleId: schedule.id,
              scheduledDate: schedule.scheduledDate,
              location: schedule.scheduledLocation || '-',
              totalUnits: schedule.qtySamples,
              results: [],
              actionUrl: portalUrl,
            }),
          },
          push: {
            title: 'Testing Schedule Completed',
            body: `All ${schedule.qtySamples} results confirmed. View your results.`,
            data: { screen: 'schedule_detail', entityId: schedule.id },
          },
          inApp: true,
        },
      });
    } catch (err: any) {
      this.logger.error(`onScheduleCompleted failed: ${err?.message}`);
    }
  }

  async onTestResultSubmitted(
    result: PostApprovalTestingResult,
    schedule: PostApprovalTestingSchedule | null,
  ): Promise<void> {
    try {
      const admins = await this.userRepo.findAll({
        filters: { role: 'admin' },
        limit: 100,
      });
      const adminUrl = `${this.appBaseUrl}/laboratory/post-approval/testing-results/${result.id}`;

      await this.notificationService.dispatchMany(
        admins.data.map(a => ({ userId: a.id! })),
        (admin) => ({
          recipientUserId: admin.userId,
          eventType: 'test_result_submitted',
          title: `Test Result Submitted — Unit ${result.sampleUnit ?? 1}`,
          message: `Result for schedule ${schedule?.scheduledDate ?? 'unknown'} has been submitted.`,
          actionUrl: adminUrl,
          entityType: 'test_result',
          entityId: result.id,
          channels: { inApp: true },
        }),
      );
    } catch (err: any) {
      this.logger.error(`onTestResultSubmitted failed: ${err?.message}`);
    }
  }

  async onTestResultConfirmed(result: PostApprovalTestingResult): Promise<void> {
    try {
      if (!result.submittedBy) return;
      const laboran = await this.userRepo.findById(result.submittedBy);
      if (!laboran) return;

      await this.notificationService.dispatch({
        recipientUserId: result.submittedBy,
        eventType: 'test_result_confirmed',
        title: `Result Confirmed — Unit ${result.sampleUnit ?? 1}`,
        message: `The customer has confirmed your test result.`,
        entityType: 'test_result',
        entityId: result.id,
        channels: {
          push: {
            title: 'Result Confirmed',
            body: `Unit ${result.sampleUnit ?? 1} result has been confirmed`,
            data: { screen: 'test_result_detail', entityId: result.id },
          },
          inApp: true,
        },
      });
    } catch (err: any) {
      this.logger.error(`onTestResultConfirmed failed: ${err?.message}`);
    }
  }

  async onContractGenerated(contract: PostApprovalLabContract, customerUserId: string): Promise<void> {
    try {
      const customerEmail = await this.resolveCustomerEmail(customerUserId);
      const portalUrl = `${this.appBaseUrl}/portal/lab/contracts/${contract.id}`;

      await this.notificationService.dispatch({
        recipientUserId: customerUserId,
        recipientEmail: customerEmail,
        eventType: 'contract_generated',
        title: `Lab Contract Generated — ${contract.contractNumber}`,
        message: `Your lab contract with ${contract.totalQuota} sample quota has been generated and is ready for scheduling.`,
        actionUrl: portalUrl,
        actionLabel: 'View Contract',
        entityType: 'contract',
        entityId: contract.id,
        channels: {
          email: {
            subject: `Your Lab Contract is Ready — ${contract.contractNumber}`,
            html: this.emailService.buildContractGeneratedHtml({
              contractNumber: contract.contractNumber,
              projectName: contract.projectName ?? '-',
              totalQuota: contract.totalQuota,
              actionUrl: portalUrl,
            }),
          },
          push: {
            title: 'Lab Contract Ready',
            body: `Contract ${contract.contractNumber} — ${contract.totalQuota} samples`,
            data: { screen: 'contract_detail', entityId: contract.id },
          },
          inApp: true,
        },
      });
    } catch (err: any) {
      this.logger.error(`onContractGenerated failed: ${err?.message}`);
    }
  }

  async onContractReadyForSigning(contract: PostApprovalLabContract, customerUserId: string): Promise<void> {
    try {
      const customerEmail = await this.resolveCustomerEmail(customerUserId);
      const portalUrl = `${this.appBaseUrl}/portal/lab/requests/${contract.testingRequestId}`;

      await this.notificationService.dispatch({
        recipientUserId: customerUserId,
        recipientEmail: customerEmail,
        eventType: 'contract_ready_for_signing',
        title: `Contract Ready for Signing — ${contract.contractNumber}`,
        message: `Your contract ${contract.contractNumber} is ready. Please download, sign, and upload it within 7 days.`,
        actionUrl: portalUrl,
        actionLabel: 'View & Sign',
        entityType: 'contract',
        entityId: contract.id,
        channels: {
          email: {
            subject: `Contract Ready for Signing — ${contract.contractNumber}`,
            html: this.emailService.buildContractReadyForSigningHtml({
              contractNumber: contract.contractNumber,
              projectName: contract.projectName ?? '-',
              actionUrl: portalUrl,
            }),
          },
          push: {
            title: 'Contract Ready for Signing',
            body: `Contract ${contract.contractNumber} — download and sign within 7 days`,
            data: { screen: 'request_detail', entityId: contract.testingRequestId },
          },
          inApp: true,
        },
      });
    } catch (err: any) {
      this.logger.error(`onContractReadyForSigning failed: ${err?.message}`);
    }
  }

  async onSignedContractUploaded(request: TestingRequest, customerUserId: string): Promise<void> {
    try {
      const admins = await this.userRepo.findAll({
        filters: { role: 'admin' },
        limit: 100,
      });
      const adminUrl = `${this.appBaseUrl}/laboratory/testing-requests/${request.id}`;

      await this.notificationService.dispatchMany(
        admins.data.map(a => ({ userId: a.id!, email: a.email })),
        (admin) => ({
          recipientUserId: admin.userId,
          recipientEmail: admin.email,
          eventType: 'signed_contract_uploaded',
          title: `Signed Contract Uploaded — ${request.requestNumber}`,
          message: `A signed contract has been uploaded for testing request ${request.requestNumber}. Please review and confirm.`,
          actionUrl: adminUrl,
          actionLabel: 'Review Contract',
          entityType: 'testing_request',
          entityId: request.id,
          channels: {
            email: {
              subject: `Signed Contract Uploaded — ${request.requestNumber}`,
              html: this.emailService.buildSignedContractUploadedHtml({
                requestNumber: request.requestNumber,
                projectName: request.projectName,
                actionUrl: adminUrl,
              }),
            },
            inApp: true,
          },
        }),
      );
    } catch (err: any) {
      this.logger.error(`onSignedContractUploaded failed: ${err?.message}`);
    }
  }

  async onContractConfirmed(request: TestingRequest, customerUserId: string): Promise<void> {
    try {
      const customerEmail = await this.resolveCustomerEmail(customerUserId);
      const portalUrl = `${this.appBaseUrl}/portal/lab/requests/${request.id}`;

      await this.notificationService.dispatch({
        recipientUserId: customerUserId,
        recipientEmail: customerEmail,
        eventType: 'contract_confirmed',
        title: `Contract Activated — ${request.requestNumber}`,
        message: `Your contract has been confirmed and is now active. You can submit unlimited testing requests under this contract.`,
        actionUrl: portalUrl,
        actionLabel: 'View Request',
        entityType: 'testing_request',
        entityId: request.id,
        channels: {
          email: {
            subject: `Contract Activated — ${request.requestNumber}`,
            html: this.emailService.buildContractConfirmedHtml({
              requestNumber: request.requestNumber,
              projectName: request.projectName,
              actionUrl: portalUrl,
            }),
          },
          push: {
            title: 'Contract Activated',
            body: `Your contract ${request.requestNumber} is now active — unlimited samples available`,
            data: { screen: 'request_detail', entityId: request.id },
          },
          inApp: true,
        },
      });
    } catch (err: any) {
      this.logger.error(`onContractConfirmed failed: ${err?.message}`);
    }
  }

  async onContractSigningExpired(request: TestingRequest, customerUserId: string): Promise<void> {
    try {
      const customerEmail = await this.resolveCustomerEmail(customerUserId);
      const portalUrl = `${this.appBaseUrl}/portal/lab/requests/${request.id}`;

      await this.notificationService.dispatch({
        recipientUserId: customerUserId,
        recipientEmail: customerEmail,
        eventType: 'contract_signing_expired',
        title: `Contract Signing Expired — ${request.requestNumber}`,
        message: `The 7-day signing period for your contract has expired. The request has been cancelled. Please submit a new request if you wish to proceed.`,
        actionUrl: portalUrl,
        actionLabel: 'View Request',
        entityType: 'testing_request',
        entityId: request.id,
        channels: {
          email: {
            subject: `Contract Signing Expired — ${request.requestNumber}`,
            html: this.emailService.buildContractSigningExpiredHtml({
              requestNumber: request.requestNumber,
              projectName: request.projectName,
              actionUrl: portalUrl,
            }),
          },
          push: {
            title: 'Contract Signing Expired',
            body: `Signing period expired for ${request.requestNumber}. The request has been cancelled.`,
            data: { screen: 'request_detail', entityId: request.id },
          },
          inApp: true,
        },
      });
    } catch (err: any) {
      this.logger.error(`onContractSigningExpired failed: ${err?.message}`);
    }
  }

  async onMonthlyInvoiceGenerated(invoice: any, customerUserId: string): Promise<void> {
    try {
      const customerEmail = await this.resolveCustomerEmail(customerUserId);
      const portalUrl = `${this.appBaseUrl}/portal/lab/contract-invoices`;

      await this.notificationService.dispatch({
        recipientUserId: customerUserId,
        recipientEmail: customerEmail,
        eventType: 'monthly_invoice_generated',
        title: `Monthly Invoice Generated — ${invoice.invoiceNumber}`,
        message: `Your monthly invoice ${invoice.invoiceNumber} for ${invoice.billingPeriodStart} to ${invoice.billingPeriodEnd} has been generated. Total: ${invoice.totalAmount}.`,
        actionUrl: portalUrl,
        actionLabel: 'View Invoice',
        entityType: 'invoice',
        entityId: invoice.id,
        channels: {
          email: {
            subject: `Monthly Invoice Generated — ${invoice.invoiceNumber}`,
            html: this.emailService.buildMonthlyInvoiceGeneratedHtml({
              invoiceNumber: invoice.invoiceNumber,
              billingPeriod: `${invoice.billingPeriodStart} to ${invoice.billingPeriodEnd}`,
              totalAmount: String(invoice.totalAmount),
              actionUrl: portalUrl,
            }),
          },
          push: {
            title: 'Monthly Invoice Generated',
            body: `Invoice ${invoice.invoiceNumber} — ${invoice.totalAmount}`,
            data: { screen: 'contract_invoices' },
          },
          inApp: true,
        },
      });
    } catch (err: any) {
      this.logger.error(`onMonthlyInvoiceGenerated failed: ${err?.message}`);
    }
  }

  private async resolveCustomerEmail(customerUserId: string): Promise<string | undefined> {
    try {
      const user = await this.userRepo.findById(customerUserId);
      return user?.email;
    } catch {
      return undefined;
    }
  }

  private async resolveCustomerUserId(customerId: string): Promise<string | null> {
    try {
      const customer = await this.customerRepo.findById(customerId);
      return (customer as any)?.userId ?? null;
    } catch {
      return null;
    }
  }
}
