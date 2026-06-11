import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PurchaseRequestTypeOrmEntity } from '../../infrastructure/entities/purchase-request-typeorm.entity';
import { PurchaseRequestLineTypeOrmEntity } from '../../infrastructure/entities/purchase-request-line-typeorm.entity';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import { DOCUMENT_TYPES } from '../../../shared/infrastructure/document-generation/document-generation.constants';

@Injectable()
export class PurchaseRequestService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly docHelper: DocumentGenerationHelper,
  ) {}

  async findAll(filters?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const repo = this.dataSource.getRepository(PurchaseRequestTypeOrmEntity);
    const qb = repo.createQueryBuilder('pr');

    if (filters?.search) {
      qb.where(
        '(pr.prNumber ILIKE :search OR pr.requestedBy ILIKE :search OR pr.departmentName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.status) {
      qb.andWhere('pr.status = :status', { status: filters.status });
    }

    qb.orderBy('pr.createdAt', 'DESC');
    qb.skip(skip);
    qb.take(limit);

    const [data, total] = await qb.getManyAndCount();

    const dataWithLines = await Promise.all(
      data.map(async (pr) => {
        const lines = await this.dataSource
          .getRepository(PurchaseRequestLineTypeOrmEntity)
          .find({ where: { purchaseRequestId: pr.id } });
        return { ...pr, lines };
      }),
    );

    return { data: dataWithLines, total, page, limit };
  }

  async findById(id: string): Promise<any> {
    const repo = this.dataSource.getRepository(PurchaseRequestTypeOrmEntity);
    const pr = await repo.findOne({ where: { id } });
    if (!pr) throw new NotFoundException('Purchase request not found');

    const lines = await this.dataSource
      .getRepository(PurchaseRequestLineTypeOrmEntity)
      .find({ where: { purchaseRequestId: id } });

    return { ...pr, lines };
  }

  async create(data: {
    requestedBy: string;
    departmentId?: string;
    departmentName?: string;
    requestDate: string;
    priority?: string;
    discountAmount?: number;
    taxAmount?: number;
    notes?: string;
    lines: {
      itemId?: string;
      itemName: string;
      description?: string;
      quantity: number;
      uom?: string;
      unitCost?: number;
      taxPercent?: number;
      lineType?: string;
    }[];
  }): Promise<any> {
    if (!data.lines || data.lines.length === 0) {
      throw new BadRequestException(
        'Purchase request must have at least one line',
      );
    }

    const prNumber = await this.generatePRNumber();

    const prRepo = this.dataSource.getRepository(PurchaseRequestTypeOrmEntity);
    const lineRepo = this.dataSource.getRepository(
      PurchaseRequestLineTypeOrmEntity,
    );

    let totalAmount = 0;
    let taxAmount = 0;
    const discountAmount = data.discountAmount ?? 0;

    const lines = await Promise.all(
      data.lines.map((line) => {
        const lineAmount = (line.quantity ?? 0) * (line.unitCost ?? 0);
        const lineTax = lineAmount * ((line.taxPercent ?? 0) / 100);
        totalAmount += lineAmount;
        taxAmount += lineTax;

        const lineEntity = lineRepo.create({
          purchaseRequestId: '', // Will be set after PR is saved
          itemId: line.itemId,
          itemName: line.itemName,
          description: line.description,
          quantity: line.quantity,
          uom: line.uom,
          unitCost: line.unitCost ?? 0,
          taxPercent: line.taxPercent ?? 0,
          lineType: line.lineType ?? 'goods',
        });
        return lineRepo.save(lineEntity);
      }),
    );

    const grandTotal = totalAmount + taxAmount - discountAmount;

    const pr = prRepo.create({
      prNumber,
      requestedBy: data.requestedBy,
      departmentId: data.departmentId,
      departmentName: data.departmentName,
      requestDate: new Date(data.requestDate),
      priority: data.priority ?? 'normal',
      status: 'draft',
      totalAmount,
      discountAmount,
      taxAmount: data.taxAmount ?? taxAmount,
      grandTotal,
      notes: data.notes,
    });

    const savedPr = await prRepo.save(pr);

    // Update lines with the actual PR ID
    await Promise.all(
      lines.map((line) => {
        line.purchaseRequestId = savedPr.id;
        return lineRepo.save(line);
      }),
    );

    return this.findById(savedPr.id);
  }

  async update(
    id: string,
    data: {
      requestedBy?: string;
      departmentId?: string;
      departmentName?: string;
      requestDate?: string;
      priority?: string;
      discountAmount?: number;
      taxAmount?: number;
      notes?: string;
      lines?: {
        itemId?: string;
        itemName: string;
        description?: string;
        quantity: number;
        uom?: string;
        unitCost?: number;
        taxPercent?: number;
        lineType?: string;
      }[];
    },
  ): Promise<any> {
    const repo = this.dataSource.getRepository(PurchaseRequestTypeOrmEntity);
    const pr = await repo.findOne({ where: { id } });
    if (!pr) throw new NotFoundException('Purchase request not found');
    if (pr.status !== 'draft') {
      throw new BadRequestException(
        'Only draft purchase requests can be updated',
      );
    }

    if (data.requestedBy !== undefined) pr.requestedBy = data.requestedBy;
    if (data.departmentId !== undefined) pr.departmentId = data.departmentId;
    if (data.departmentName !== undefined)
      pr.departmentName = data.departmentName;
    if (data.requestDate !== undefined)
      pr.requestDate = new Date(data.requestDate);
    if (data.priority !== undefined) pr.priority = data.priority;
    if (data.discountAmount !== undefined)
      pr.discountAmount = data.discountAmount;
    if (data.notes !== undefined) pr.notes = data.notes;

    if (data.lines) {
      const lineRepo = this.dataSource.getRepository(
        PurchaseRequestLineTypeOrmEntity,
      );
      await lineRepo.delete({ purchaseRequestId: id });

      let totalAmount = 0;
      let taxAmount = 0;

      await Promise.all(
        data.lines.map((line) => {
          const lineAmount = (line.quantity ?? 0) * (line.unitCost ?? 0);
          const lineTax = lineAmount * ((line.taxPercent ?? 0) / 100);
          totalAmount += lineAmount;
          taxAmount += lineTax;

          const lineEntity = lineRepo.create({
            purchaseRequestId: id,
            itemId: line.itemId,
            itemName: line.itemName,
            description: line.description,
            quantity: line.quantity,
            uom: line.uom,
            unitCost: line.unitCost ?? 0,
            taxPercent: line.taxPercent ?? 0,
            lineType: line.lineType ?? 'goods',
          });
          return lineRepo.save(lineEntity);
        }),
      );

      pr.totalAmount = totalAmount;
      pr.taxAmount = data.taxAmount ?? taxAmount;
      pr.grandTotal =
        totalAmount +
        (data.taxAmount ?? taxAmount) -
        Number(pr.discountAmount ?? 0);
    }

    await repo.save(pr);
    return this.findById(id);
  }

  async approve(id: string, approverId: string): Promise<any> {
    const repo = this.dataSource.getRepository(PurchaseRequestTypeOrmEntity);
    const pr = await repo.findOne({ where: { id } });
    if (!pr) throw new NotFoundException('Purchase request not found');
    if (pr.status !== 'draft') {
      throw new BadRequestException(
        'Only draft purchase requests can be approved',
      );
    }

    pr.status = 'approved';
    pr.approvedBy = approverId;
    pr.approvedAt = new Date();
    await repo.save(pr);

    void this.docHelper.generateAsync({
      requestId: uuidv4(),
      documentType: DOCUMENT_TYPES.PURCHASE_REQUEST,
      entityId: id,
      tenantId: 'default',
      requestedBy: approverId,
      outputFormat: 'pdf',
    });

    return this.findById(id);
  }

  async reject(id: string, approverId: string, reason?: string): Promise<any> {
    const repo = this.dataSource.getRepository(PurchaseRequestTypeOrmEntity);
    const pr = await repo.findOne({ where: { id } });
    if (!pr) throw new NotFoundException('Purchase request not found');
    if (pr.status !== 'draft') {
      throw new BadRequestException(
        'Only draft purchase requests can be rejected',
      );
    }

    pr.status = 'rejected';
    pr.approvedBy = approverId;
    pr.approvedAt = new Date();
    pr.rejectionReason = reason ?? '';
    await repo.save(pr);

    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const repo = this.dataSource.getRepository(PurchaseRequestTypeOrmEntity);
    const pr = await repo.findOne({ where: { id } });
    if (!pr) throw new NotFoundException('Purchase request not found');
    if (pr.status !== 'draft' && pr.status !== 'rejected') {
      throw new BadRequestException(
        'Only draft or rejected purchase requests can be deleted',
      );
    }

    const lineRepo = this.dataSource.getRepository(
      PurchaseRequestLineTypeOrmEntity,
    );
    await lineRepo.delete({ purchaseRequestId: id });
    await repo.remove(pr);
  }

  private async generatePRNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PR-${year}-`;
    const repo = this.dataSource.getRepository(PurchaseRequestTypeOrmEntity);

    const result = await repo
      .createQueryBuilder('pr')
      .select('pr.prNumber', 'prNumber')
      .where('pr.prNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('pr.prNumber', 'DESC')
      .limit(1)
      .getRawOne();

    if (!result?.prNumber) return `${prefix}0001`;
    const seq = parseInt(result.prNumber.replace(prefix, ''), 10) + 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }
}
