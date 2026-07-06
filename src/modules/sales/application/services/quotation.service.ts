import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { QuotationTypeOrmEntity } from '../../infrastructure/entities/quotation-typeorm.entity';
import { QuotationLineTypeOrmEntity } from '../../infrastructure/entities/quotation-line-typeorm.entity';
import {
  CreateQuotationHttpDto,
  UpdateQuotationHttpDto,
} from '../../infrastructure/http/dtos/quotation.dto';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import { DOCUMENT_TYPES } from '../../../shared/infrastructure/document-generation/document-generation.constants';

@Injectable()
export class QuotationService {
  private readonly quotationRepo: Repository<QuotationTypeOrmEntity>;
  private readonly lineRepo: Repository<QuotationLineTypeOrmEntity>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly docHelper: DocumentGenerationHelper,
  ) {
    this.quotationRepo = dataSource.getRepository(QuotationTypeOrmEntity);
    this.lineRepo = dataSource.getRepository(QuotationLineTypeOrmEntity);
  }

  async findAll(filters?: {
    search?: string;
    status?: string;
    customerId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: QuotationTypeOrmEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const qb = this.quotationRepo.createQueryBuilder('q');

    if (filters?.search) {
      qb.where(
        '(q.quotationNumber ILIKE :search OR q.customerName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.status) {
      qb.andWhere('q.status = :status', { status: filters.status });
    }
    if (filters?.customerId) {
      qb.andWhere('q.customerId = :customerId', {
        customerId: filters.customerId,
      });
    }

    qb.orderBy('q.quotationDate', 'DESC');
    qb.leftJoinAndSelect('q.lines', 'lines');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<QuotationTypeOrmEntity> {
    const entity = await this.quotationRepo.findOne({
      where: { id },
      relations: ['lines'],
    });
    if (!entity) throw new NotFoundException('Quotation not found');
    return entity;
  }

  async create(dto: CreateQuotationHttpDto): Promise<QuotationTypeOrmEntity> {
    const quotationNumber = await this.generateQuotationNumber();

    let totalAmount = 0;
    let taxAmount = 0;

    for (const line of dto.lines) {
      const lineAmount = line.quantity * line.unitPrice;
      const lineDiscount = line.discountAmount ?? 0;
      const lineTax =
        (lineAmount - lineDiscount) * ((line.taxPercent ?? 0) / 100);
      totalAmount += lineAmount - lineDiscount;
      taxAmount += lineTax;
    }

    const discountAmount = dto.discountAmount ?? 0;
    const grandTotal = totalAmount + taxAmount - discountAmount;

    const quotation = this.quotationRepo.create({
      quotationNumber,
      customerId: dto.customerId,
      customerName: dto.customerName ?? '',
      quotationDate: new Date(dto.quotationDate),
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      status: 'draft',
      totalAmount,
      discountAmount,
      taxAmount,
      grandTotal,
      notes: dto.notes ?? null,
    });

    const savedQuotation = await this.quotationRepo.save(quotation);

    for (const line of dto.lines) {
      const lineAmount = line.quantity * line.unitPrice;
      const lineDiscount = line.discountAmount ?? 0;
      const lineTax =
        (lineAmount - lineDiscount) * ((line.taxPercent ?? 0) / 100);
      await this.lineRepo.save(
        this.lineRepo.create({
          quotationId: savedQuotation.id,
          itemId: line.itemId ?? null,
          itemName: line.itemName,
          description: line.description ?? null,
          quantity: line.quantity,
          uom: line.uom ?? null,
          unitPrice: line.unitPrice,
          taxPercent: line.taxPercent ?? 0,
          amount: lineAmount - lineDiscount + lineTax,
          discountAmount: lineDiscount,
          lineType: line.lineType ?? 'goods',
        }),
      );
    }

    return this.findById(savedQuotation.id);
  }

  async update(
    id: string,
    dto: UpdateQuotationHttpDto,
  ): Promise<QuotationTypeOrmEntity> {
    const entity = await this.quotationRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Quotation not found');
    if (entity.status !== 'draft') {
      throw new BadRequestException('Only draft quotations can be edited');
    }

    if (dto.customerId !== undefined) entity.customerId = dto.customerId;
    if (dto.customerName !== undefined) entity.customerName = dto.customerName;
    if (dto.quotationDate !== undefined)
      entity.quotationDate = new Date(dto.quotationDate);
    if (dto.validUntil !== undefined)
      entity.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (dto.discountAmount !== undefined)
      entity.discountAmount = dto.discountAmount;
    if (dto.notes !== undefined) entity.notes = dto.notes ?? null;

    if (dto.lines) {
      const existingLines = await this.lineRepo.find({
        where: { quotationId: id },
      });
      for (const line of existingLines) {
        await this.lineRepo.softDelete(line.id);
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

        await this.lineRepo.save(
          this.lineRepo.create({
            quotationId: id,
            itemId: line.itemId ?? null,
            itemName: line.itemName,
            description: line.description ?? null,
            quantity: line.quantity,
            uom: line.uom ?? null,
            unitPrice: line.unitPrice,
            taxPercent: line.taxPercent ?? 0,
            amount: lineAmount - lineDiscount + lineTax,
            discountAmount: lineDiscount,
            lineType: line.lineType ?? 'goods',
          }),
        );
      }

      entity.totalAmount = totalAmount;
      entity.taxAmount = taxAmount;
      entity.grandTotal =
        totalAmount + taxAmount - Number(entity.discountAmount ?? 0);
    }

    await this.quotationRepo.save(entity);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const entity = await this.quotationRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Quotation not found');
    if (entity.status !== 'draft') {
      throw new BadRequestException('Only draft quotations can be deleted');
    }
    await this.quotationRepo.softDelete(id);
  }

  async send(id: string): Promise<QuotationTypeOrmEntity> {
    const entity = await this.quotationRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Quotation not found');
    if (entity.status !== 'draft') {
      throw new BadRequestException('Only draft quotations can be sent');
    }
    entity.status = 'sent';
    await this.quotationRepo.save(entity);

    void this.docHelper.generateAsync({
      requestId: uuidv4(),
      documentType: DOCUMENT_TYPES.QUOTATION,
      entityId: id,
      tenantId: 'default',
      requestedBy: 'system',
      outputFormat: 'pdf',
    });

    return this.findById(id);
  }

  async accept(id: string): Promise<QuotationTypeOrmEntity> {
    const entity = await this.quotationRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Quotation not found');
    if (entity.status !== 'sent') {
      throw new BadRequestException('Only sent quotations can be accepted');
    }
    entity.status = 'accepted';
    await this.quotationRepo.save(entity);
    return this.findById(id);
  }

  async reject(id: string, reason?: string): Promise<QuotationTypeOrmEntity> {
    const entity = await this.quotationRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Quotation not found');
    if (entity.status !== 'sent') {
      throw new BadRequestException('Only sent quotations can be rejected');
    }
    entity.status = 'rejected';
    if (reason) {
      entity.notes = entity.notes
        ? `${entity.notes}\nRejection: ${reason}`
        : `Rejection: ${reason}`;
    }
    await this.quotationRepo.save(entity);
    return this.findById(id);
  }

  private async generateQuotationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QT-${year}-`;
    const last = await this.quotationRepo
      .createQueryBuilder('q')
      .where('q.quotationNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('q.quotationNumber', 'DESC')
      .getOne();

    if (!last) return `${prefix}0001`;
    const seq = parseInt(last.quotationNumber.replace(prefix, ''), 10) + 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }
}
