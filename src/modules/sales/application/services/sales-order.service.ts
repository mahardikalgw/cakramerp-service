import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SalesOrderTypeOrmEntity } from '../../infrastructure/entities/sales-order-typeorm.entity';
import { SalesOrderLineTypeOrmEntity } from '../../infrastructure/entities/sales-order-line-typeorm.entity';
import { QuotationTypeOrmEntity } from '../../infrastructure/entities/quotation-typeorm.entity';
import { QuotationLineTypeOrmEntity } from '../../infrastructure/entities/quotation-line-typeorm.entity';
import {
  CreateSalesOrderHttpDto,
  UpdateSalesOrderHttpDto,
} from '../../infrastructure/http/dtos/sales-order.dto';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import { DOCUMENT_TYPES } from '../../../shared/infrastructure/document-generation/document-generation.constants';

@Injectable()
export class SalesOrderService {
  private readonly logger = new Logger(SalesOrderService.name);
  private readonly soRepo: Repository<SalesOrderTypeOrmEntity>;
  private readonly soLineRepo: Repository<SalesOrderLineTypeOrmEntity>;
  private readonly quotationRepo: Repository<QuotationTypeOrmEntity>;
  private readonly quotationLineRepo: Repository<QuotationLineTypeOrmEntity>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly docHelper: DocumentGenerationHelper,
  ) {
    this.soRepo = dataSource.getRepository(SalesOrderTypeOrmEntity);
    this.soLineRepo = dataSource.getRepository(SalesOrderLineTypeOrmEntity);
    this.quotationRepo = dataSource.getRepository(QuotationTypeOrmEntity);
    this.quotationLineRepo = dataSource.getRepository(
      QuotationLineTypeOrmEntity,
    );
  }

  async findAll(filters?: {
    search?: string;
    status?: string;
    customerId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: SalesOrderTypeOrmEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const qb = this.soRepo.createQueryBuilder('so');

    if (filters?.search) {
      qb.where('(so.soNumber ILIKE :search OR so.customerName ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    if (filters?.status) {
      qb.andWhere('so.status = :status', { status: filters.status });
    }
    if (filters?.customerId) {
      qb.andWhere('so.customerId = :customerId', {
        customerId: filters.customerId,
      });
    }

    qb.orderBy('so.orderDate', 'DESC');
    qb.leftJoinAndSelect('so.lines', 'lines');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<SalesOrderTypeOrmEntity> {
    const entity = await this.soRepo.findOne({
      where: { id },
      relations: ['lines'],
    });
    if (!entity) throw new NotFoundException('Sales order not found');
    return entity;
  }

  async create(dto: CreateSalesOrderHttpDto): Promise<SalesOrderTypeOrmEntity> {
    const soNumber = await this.generateSalesOrderNumber();

    let totalAmount = 0;
    let taxAmount = 0;
    const linesToCreate: Partial<SalesOrderLineTypeOrmEntity>[] = [];

    if (dto.quotationId) {
      const quotation = await this.quotationRepo.findOne({
        where: { id: dto.quotationId },
        relations: ['lines'],
      });
      if (!quotation) {
        throw new NotFoundException('Quotation not found');
      }

      for (const qLine of quotation.lines) {
        const lineAmount = Number(qLine.quantity) * Number(qLine.unitPrice);
        const lineDiscount = Number(qLine.discountAmount ?? 0);
        const lineTax =
          (lineAmount - lineDiscount) * (Number(qLine.taxPercent) / 100);
        totalAmount += lineAmount - lineDiscount;
        taxAmount += lineTax;

        linesToCreate.push({
          quotationLineId: qLine.id,
          itemId: qLine.itemId,
          itemName: qLine.itemName,
          description: qLine.description,
          quantity: qLine.quantity,
          deliveredQuantity: 0,
          uom: qLine.uom,
          unitPrice: qLine.unitPrice,
          taxPercent: qLine.taxPercent,
          amount: lineAmount - lineDiscount + lineTax,
          discountAmount: lineDiscount,
          lineType: qLine.lineType,
          fulfillmentStatus: 'pending',
        });
      }
    } else {
      for (const line of dto.lines) {
        const lineAmount = line.quantity * line.unitPrice;
        const lineDiscount = line.discountAmount ?? 0;
        const lineTax =
          (lineAmount - lineDiscount) * ((line.taxPercent ?? 0) / 100);
        totalAmount += lineAmount - lineDiscount;
        taxAmount += lineTax;

        linesToCreate.push({
          quotationLineId: line.quotationLineId ?? null,
          itemId: line.itemId ?? null,
          itemName: line.itemName,
          description: line.description ?? null,
          quantity: line.quantity,
          deliveredQuantity: 0,
          uom: line.uom ?? 'pcs',
          unitPrice: line.unitPrice,
          taxPercent: line.taxPercent ?? 0,
          amount: lineAmount - lineDiscount + lineTax,
          discountAmount: lineDiscount,
          lineType: line.lineType ?? 'goods',
          fulfillmentStatus: 'pending',
        });
      }
    }

    const discountAmount = dto.discountAmount ?? 0;
    const grandTotal = totalAmount + taxAmount - discountAmount;

    const so = this.soRepo.create({
      soNumber,
      customerId: dto.customerId,
      customerName: dto.customerName ?? '',
      quotationId: dto.quotationId ?? null,
      orderDate: new Date(dto.orderDate),
      expectedDeliveryDate: dto.expectedDeliveryDate
        ? new Date(dto.expectedDeliveryDate)
        : null,
      status: 'draft',
      totalAmount,
      discountAmount,
      taxAmount,
      grandTotal,
      paymentTermDays: dto.paymentTermDays ?? 30,
      paymentTermLabel: dto.paymentTermLabel ?? null,
      notes: dto.notes ?? null,
    });

    const savedSo = await this.soRepo.save(so);

    for (const line of linesToCreate) {
      await this.soLineRepo.save(
        this.soLineRepo.create({
          ...line,
          salesOrderId: savedSo.id,
        }),
      );
    }

    return this.findById(savedSo.id);
  }

  async update(
    id: string,
    dto: UpdateSalesOrderHttpDto,
  ): Promise<SalesOrderTypeOrmEntity> {
    const entity = await this.soRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Sales order not found');
    if (entity.status !== 'draft') {
      throw new BadRequestException('Only draft sales orders can be edited');
    }

    if (dto.customerId !== undefined) entity.customerId = dto.customerId;
    if (dto.customerName !== undefined) entity.customerName = dto.customerName;
    if (dto.orderDate !== undefined) entity.orderDate = new Date(dto.orderDate);
    if (dto.expectedDeliveryDate !== undefined)
      entity.expectedDeliveryDate = dto.expectedDeliveryDate
        ? new Date(dto.expectedDeliveryDate)
        : null;
    if (dto.discountAmount !== undefined)
      entity.discountAmount = dto.discountAmount;
    if (dto.paymentTermDays !== undefined)
      entity.paymentTermDays = dto.paymentTermDays;
    if (dto.paymentTermLabel !== undefined)
      entity.paymentTermLabel = dto.paymentTermLabel ?? null;
    if (dto.notes !== undefined) entity.notes = dto.notes ?? null;

    if (dto.lines) {
      const existingLines = await this.soLineRepo.find({
        where: { salesOrderId: id },
      });
      for (const line of existingLines) {
        await this.soLineRepo.delete(line.id);
      }

      let totalAmount = 0;
      let taxAmount = 0;

      for (const line of dto.lines) {
        const lineAmount = line.quantity * line.unitPrice;
        const lineDiscount = line.discountAmount ?? 0;
        const lineTax =
          (lineAmount - lineDiscount) * ((line.taxPercent ?? 0) / 100);
        totalAmount += lineAmount - lineDiscount;
        taxAmount += lineTax;

        await this.soLineRepo.save(
          this.soLineRepo.create({
            salesOrderId: id,
            quotationLineId: line.quotationLineId ?? null,
            itemId: line.itemId ?? null,
            itemName: line.itemName,
            description: line.description ?? null,
            quantity: line.quantity,
            deliveredQuantity: 0,
            uom: line.uom ?? null,
            unitPrice: line.unitPrice,
            taxPercent: line.taxPercent ?? 0,
            amount: lineAmount - lineDiscount + lineTax,
            discountAmount: lineDiscount,
            lineType: line.lineType ?? 'goods',
            fulfillmentStatus: 'pending',
          }),
        );
      }

      entity.totalAmount = totalAmount;
      entity.taxAmount = taxAmount;
      entity.grandTotal =
        totalAmount + taxAmount - Number(entity.discountAmount ?? 0);
    }

    await this.soRepo.save(entity);
    return this.findById(id);
  }

  async approve(id: string, userId?: string): Promise<SalesOrderTypeOrmEntity> {
    const entity = await this.soRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Sales order not found');
    if (entity.status !== 'draft') {
      throw new BadRequestException('Only draft sales orders can be approved');
    }

    entity.status = 'approved';
    entity.approvedBy = userId ?? 'system';
    entity.approvedAt = new Date();
    await this.soRepo.save(entity);

    // Generate SO document synchronously via REST
    try {
      await this.docHelper.generateDocument({
        documentType: DOCUMENT_TYPES.SALES_ORDER,
        entityId: id,
        outputFormat: 'pdf',
      });
    } catch {
      this.logger.warn(
        `SO document generation failed (non-blocking) for SO ${id}`,
      );
    }

    return this.findById(id);
  }

  async reject(
    id: string,
    rejectionReason?: string,
  ): Promise<SalesOrderTypeOrmEntity> {
    const entity = await this.soRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Sales order not found');
    if (entity.status !== 'draft') {
      throw new BadRequestException('Only draft sales orders can be rejected');
    }

    entity.status = 'rejected';
    entity.rejectionReason = rejectionReason ?? null;
    if (rejectionReason) {
      entity.notes = entity.notes
        ? `${entity.notes}\nRejection: ${rejectionReason}`
        : `Rejection: ${rejectionReason}`;
    }
    await this.soRepo.save(entity);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const entity = await this.soRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Sales order not found');
    if (entity.status !== 'draft') {
      throw new BadRequestException('Only draft sales orders can be deleted');
    }
    await this.soRepo.delete(id);
  }

  async cancel(id: string, reason?: string): Promise<SalesOrderTypeOrmEntity> {
    const entity = await this.soRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Sales order not found');

    const terminalStatuses = ['cancelled', 'fully_delivered', 'invoiced'];
    if (terminalStatuses.includes(entity.status)) {
      throw new BadRequestException(
        `Cannot cancel a sales order with status '${entity.status}'`,
      );
    }

    const issuanceCheck = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt FROM stock_issuances WHERE so_id = $1`,
      [id],
    );
    if (issuanceCheck[0]?.cnt > 0) {
      throw new BadRequestException(
        'Cannot cancel: stock issuance(s) already linked to this SO',
      );
    }

    const arCheck = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt FROM document_links
       WHERE source_type = 'sales_order' AND source_id = $1
       AND target_type = 'ar_invoice'`,
      [id],
    );
    if (arCheck[0]?.cnt > 0) {
      throw new BadRequestException(
        'Cannot cancel: AR invoice(s) already linked to this SO',
      );
    }

    entity.status = 'cancelled';
    if (reason) {
      entity.notes = entity.notes
        ? `${entity.notes}\nCancellation: ${reason}`
        : `Cancellation: ${reason}`;
    }
    await this.soRepo.save(entity);
    return this.findById(id);
  }

  private async generateSalesOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SO-${year}-`;
    const last = await this.soRepo
      .createQueryBuilder('so')
      .where('so.soNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('so.soNumber', 'DESC')
      .getOne();

    if (!last) return `${prefix}0001`;
    const seq = parseInt(last.soNumber.replace(prefix, ''), 10) + 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }
}
