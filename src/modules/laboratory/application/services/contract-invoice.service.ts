import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ContractInvoice } from '../../domain/entities/contract-invoice.entity';
import type { ContractInvoiceRepositoryPort } from '../../domain/repositories/contract-invoice-repository.port';
import { CONTRACT_INVOICE_REPOSITORY } from '../../domain/repositories/contract-invoice-repository.port';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import { LabActivityLogService } from './lab-activity-log.service';

@Injectable()
export class ContractInvoiceService {
  private readonly logger = new Logger(ContractInvoiceService.name);

  constructor(
    @Inject(CONTRACT_INVOICE_REPOSITORY)
    private readonly repository: ContractInvoiceRepositoryPort,
    private readonly docHelper: DocumentGenerationHelper,
    private readonly activityLog: LabActivityLogService,
  ) {}

  async findAll(options?: {
    status?: string;
    contractId?: string;
    page?: number;
    limit?: number;
  }) {
    const filters: Record<string, any> = {};
    if (options?.status) filters.status = options.status;
    if (options?.contractId) filters.contractId = options.contractId;
    return this.repository.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
    });
  }

  async findById(id: string): Promise<ContractInvoice | null> {
    const invoice = await this.repository.findById(id);
    if (!invoice) throw new NotFoundException('Contract invoice not found');
    return invoice;
  }

  async findByContractId(contractId: string): Promise<ContractInvoice[]> {
    return this.repository.findByContractId(contractId);
  }

  async getDownloadUrl(id: string): Promise<{ url: string; filename: string }> {
    const invoice = await this.repository.findById(id);
    if (!invoice) throw new NotFoundException('Contract invoice not found');
    if (!invoice.invoiceDocumentUrl)
      throw new NotFoundException('Invoice document not yet generated');
    const url = await this.docHelper.getDownloadUrl(invoice.invoiceDocumentUrl);
    return { url, filename: `${invoice.invoiceNumber}.pdf` };
  }

  async markAsPaid(
    id: string,
    adminUserId: string,
    adminUserName?: string,
  ): Promise<ContractInvoice> {
    const invoice = await this.repository.findById(id);
    if (!invoice) throw new NotFoundException('Contract invoice not found');
    if (invoice.status === 'paid')
      throw new BadRequestException('Invoice is already paid');
    if (invoice.status === 'cancelled')
      throw new BadRequestException('Cannot mark cancelled invoice as paid');

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.paidAmount = invoice.totalAmount;
    const saved = await this.repository.save(invoice);

    this.logger.log(
      `Invoice ${invoice.invoiceNumber} marked as paid by ${adminUserId}`,
    );

    return saved;
  }
}
