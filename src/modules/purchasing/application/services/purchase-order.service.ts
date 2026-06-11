import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PurchaseOrderTypeOrmEntity } from '../../infrastructure/entities/purchase-order-typeorm.entity';
import { PurchaseOrderLineTypeOrmEntity } from '../../infrastructure/entities/purchase-order-line-typeorm.entity';
import { PurchaseRequestLineTypeOrmEntity } from '../../infrastructure/entities/purchase-request-line-typeorm.entity';
import { GL_POSTING_QUEUE_PORT } from '../../../../shared/kernel/domain/ports/gl-posting-queue.port';
import type { GlPostingQueuePort } from '../../../../shared/kernel/domain/ports/gl-posting-queue.port';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import { DOCUMENT_TYPES } from '../../../shared/infrastructure/document-generation/document-generation.constants';

@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(GL_POSTING_QUEUE_PORT)
    private readonly glPostingQueue: GlPostingQueuePort,
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

    const repo = this.dataSource.getRepository(PurchaseOrderTypeOrmEntity);
    const qb = repo.createQueryBuilder('po');

    if (filters?.search) {
      qb.where('(po.poNumber ILIKE :search OR po.supplierName ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    if (filters?.status) {
      qb.andWhere('po.status = :status', { status: filters.status });
    }

    qb.orderBy('po.createdAt', 'DESC');
    qb.skip(skip);
    qb.take(limit);

    const [data, total] = await qb.getManyAndCount();

    const dataWithLines = await Promise.all(
      data.map(async (po) => {
        const lines = await this.dataSource
          .getRepository(PurchaseOrderLineTypeOrmEntity)
          .find({ where: { purchaseOrderId: po.id } });
        return { ...po, lines };
      }),
    );

    return { data: dataWithLines, total, page, limit };
  }

  async findById(id: string): Promise<any> {
    const repo = this.dataSource.getRepository(PurchaseOrderTypeOrmEntity);
    const po = await repo.findOne({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');

    const lines = await this.dataSource
      .getRepository(PurchaseOrderLineTypeOrmEntity)
      .find({ where: { purchaseOrderId: id } });

    return { ...po, lines };
  }

  async create(data: {
    supplierId: string;
    supplierName?: string;
    purchaseRequestId?: string;
    orderDate: string;
    expectedDeliveryDate?: string;
    discountAmount?: number;
    taxAmount?: number;
    paymentTermDays?: number;
    paymentTermLabel?: string;
    notes?: string;
    lines: {
      purchaseRequestLineId?: string;
      itemId?: string;
      itemName: string;
      description?: string;
      quantity: number;
      uom?: string;
      unitCost: number;
      taxPercent?: number;
      discountAmount?: number;
      lineType?: string;
    }[];
  }): Promise<any> {
    let linesToUse = data.lines;

    if (data.purchaseRequestId) {
      const prLines = await this.dataSource
        .getRepository(PurchaseRequestLineTypeOrmEntity)
        .find({ where: { purchaseRequestId: data.purchaseRequestId } });

      if (prLines.length > 0) {
        linesToUse = prLines.map((prLine) => ({
          purchaseRequestLineId: prLine.id,
          itemId: prLine.itemId,
          itemName: prLine.itemName,
          description: prLine.description,
          quantity: Number(prLine.quantity),
          uom: prLine.uom,
          unitCost: Number(prLine.unitCost),
          lineType: prLine.lineType,
        }));
      }
    }

    if (!linesToUse || linesToUse.length === 0) {
      throw new BadRequestException(
        'Purchase order must have at least one line',
      );
    }

    const poNumber = await this.generatePONumber();

    const poRepo = this.dataSource.getRepository(PurchaseOrderTypeOrmEntity);
    const lineRepo = this.dataSource.getRepository(
      PurchaseOrderLineTypeOrmEntity,
    );

    const totalAmount = linesToUse.reduce(
      (sum, line) => sum + line.quantity * line.unitCost,
      0,
    );

    const lineTaxAmount = linesToUse.reduce(
      (sum, line) =>
        sum + line.quantity * line.unitCost * ((line.taxPercent ?? 0) / 100),
      0,
    );

    const discountAmount = data.discountAmount ?? 0;
    const taxAmount = data.taxAmount ?? lineTaxAmount;
    const grandTotal = totalAmount + taxAmount - discountAmount;

    const po = poRepo.create({
      poNumber,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      purchaseRequestId: data.purchaseRequestId,
      orderDate: new Date(data.orderDate),
      expectedDeliveryDate: data.expectedDeliveryDate
        ? new Date(data.expectedDeliveryDate)
        : null,
      status: 'draft',
      totalAmount,
      discountAmount,
      taxAmount,
      grandTotal,
      paymentTermDays: data.paymentTermDays ?? 30,
      paymentTermLabel: data.paymentTermLabel,
      notes: data.notes,
    });

    const savedPo = (await poRepo.save(po)) as PurchaseOrderTypeOrmEntity;

    const lines = await Promise.all(
      linesToUse.map((line) => {
        const lineAmount = line.quantity * line.unitCost;
        const lineTax = lineAmount * ((line.taxPercent ?? 0) / 100);
        const lineEntity = lineRepo.create({
          purchaseOrderId: savedPo.id,
          purchaseRequestLineId: line.purchaseRequestLineId,
          itemId: line.itemId,
          itemName: line.itemName,
          description: line.description,
          quantity: line.quantity,
          uom: line.uom,
          unitCost: line.unitCost,
          totalCost: lineAmount,
          taxPercent: line.taxPercent ?? 0,
          taxAmount: lineTax,
          discountAmount: line.discountAmount ?? 0,
          lineType: line.lineType ?? 'goods',
        });
        return lineRepo.save(lineEntity);
      }),
    );

    return { ...savedPo, lines };
  }

  async update(
    id: string,
    data: {
      supplierId?: string;
      supplierName?: string;
      purchaseRequestId?: string;
      orderDate?: string;
      expectedDeliveryDate?: string;
      discountAmount?: number;
      taxAmount?: number;
      paymentTermDays?: number;
      paymentTermLabel?: string;
      notes?: string;
      lines?: {
        purchaseRequestLineId?: string;
        itemId?: string;
        itemName: string;
        description?: string;
        quantity: number;
        uom?: string;
        unitCost: number;
        taxPercent?: number;
        discountAmount?: number;
        lineType?: string;
      }[];
    },
  ): Promise<any> {
    const repo = this.dataSource.getRepository(PurchaseOrderTypeOrmEntity);
    const po = await repo.findOne({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'draft') {
      throw new BadRequestException(
        'Only draft purchase orders can be updated',
      );
    }

    if (data.supplierId !== undefined) po.supplierId = data.supplierId;
    if (data.supplierName !== undefined) po.supplierName = data.supplierName;
    if (data.purchaseRequestId !== undefined)
      po.purchaseRequestId = data.purchaseRequestId;
    if (data.orderDate !== undefined) po.orderDate = new Date(data.orderDate);
    if (data.expectedDeliveryDate !== undefined) {
      po.expectedDeliveryDate = data.expectedDeliveryDate
        ? new Date(data.expectedDeliveryDate)
        : null;
    }
    if (data.paymentTermDays !== undefined)
      po.paymentTermDays = data.paymentTermDays;
    if (data.paymentTermLabel !== undefined)
      po.paymentTermLabel = data.paymentTermLabel;
    if (data.discountAmount !== undefined)
      po.discountAmount = data.discountAmount;
    if (data.taxAmount !== undefined) po.taxAmount = data.taxAmount;
    if (data.notes !== undefined) po.notes = data.notes;

    if (data.lines) {
      const totalAmount = data.lines.reduce(
        (sum, line) => sum + line.quantity * line.unitCost,
        0,
      );
      const lineTaxAmount = data.lines.reduce(
        (sum, line) =>
          sum + line.quantity * line.unitCost * ((line.taxPercent ?? 0) / 100),
        0,
      );
      po.totalAmount = totalAmount;
      if (data.taxAmount === undefined) po.taxAmount = lineTaxAmount;
      po.grandTotal =
        totalAmount + (po.taxAmount ?? 0) - Number(po.discountAmount ?? 0);
    }

    await repo.save(po);

    if (data.lines) {
      const lineRepo = this.dataSource.getRepository(
        PurchaseOrderLineTypeOrmEntity,
      );
      await lineRepo.delete({ purchaseOrderId: id });

      await Promise.all(
        data.lines.map((line) => {
          const lineAmount = line.quantity * line.unitCost;
          const lineTax = lineAmount * ((line.taxPercent ?? 0) / 100);
          const lineEntity = lineRepo.create({
            purchaseOrderId: id,
            purchaseRequestLineId: line.purchaseRequestLineId,
            itemId: line.itemId,
            itemName: line.itemName,
            description: line.description,
            quantity: line.quantity,
            uom: line.uom,
            unitCost: line.unitCost,
            totalCost: lineAmount,
            taxPercent: line.taxPercent ?? 0,
            taxAmount: lineTax,
            discountAmount: line.discountAmount ?? 0,
            lineType: line.lineType ?? 'goods',
          });
          return lineRepo.save(lineEntity);
        }),
      );
    }

    return this.findById(id);
  }

  async approve(id: string, approverId: string): Promise<any> {
    const repo = this.dataSource.getRepository(PurchaseOrderTypeOrmEntity);
    const po = await repo.findOne({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'draft') {
      throw new BadRequestException(
        'Only draft purchase orders can be approved',
      );
    }

    po.status = 'approved';
    po.approvedBy = approverId;
    po.approvedAt = new Date();
    await repo.save(po);

    void this.docHelper.generateAsync({
      requestId: uuidv4(),
      documentType: DOCUMENT_TYPES.PURCHASE_ORDER,
      entityId: id,
      tenantId: 'default',
      requestedBy: approverId,
      outputFormat: 'pdf',
    });

    return this.findById(id);
  }

  async reject(
    id: string,
    approverId: string,
    reason?: string | null,
  ): Promise<any> {
    const repo = this.dataSource.getRepository(PurchaseOrderTypeOrmEntity);
    const po = await repo.findOne({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'draft') {
      throw new BadRequestException(
        'Only draft purchase orders can be rejected',
      );
    }

    po.status = 'rejected';
    po.approvedBy = approverId;
    po.approvedAt = new Date();
    po.rejectionReason = reason ?? '';
    await repo.save(po);

    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const repo = this.dataSource.getRepository(PurchaseOrderTypeOrmEntity);
    const po = await repo.findOne({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'draft' && po.status !== 'rejected') {
      throw new BadRequestException(
        'Only draft or rejected purchase orders can be deleted',
      );
    }

    const lineRepo = this.dataSource.getRepository(
      PurchaseOrderLineTypeOrmEntity,
    );
    await lineRepo.delete({ purchaseOrderId: id });
    await repo.remove(po);
  }

  async cancel(id: string, userId: string, reason?: string): Promise<any> {
    const repo = this.dataSource.getRepository(PurchaseOrderTypeOrmEntity);
    const po = await repo.findOne({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');

    const terminalStatuses = ['cancelled', 'fully_received', 'invoiced'];
    if (terminalStatuses.includes(po.status)) {
      throw new BadRequestException(
        `Cannot cancel a purchase order with status '${po.status}'`,
      );
    }

    const grnCheck = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt FROM goods_receipts WHERE po_id = $1`,
      [id],
    );
    if (grnCheck[0]?.cnt > 0) {
      throw new BadRequestException(
        'Cannot cancel: goods receipt(s) already linked to this PO',
      );
    }

    const apCheck = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt FROM ap_invoices WHERE po_reference_id = $1`,
      [id],
    );
    if (apCheck[0]?.cnt > 0) {
      throw new BadRequestException(
        'Cannot cancel: AP invoice(s) already linked to this PO',
      );
    }

    po.status = 'cancelled';
    if (reason) {
      po.notes = po.notes
        ? `${po.notes}\nCancellation: ${reason}`
        : `Cancellation: ${reason}`;
    }
    await repo.save(po);
    return this.findById(id);
  }

  async createGlPostingEntry(
    poId: string,
    sourceType: 'supplier_invoice',
  ): Promise<void> {
    const po = await this.findById(poId);

    const glEntry = await this.glPostingQueue.createEntry({
      sourceType,
      sourceId: po.id,
      sourceNumber: po.poNumber,
      eventType: 'po_created',
      amount: Number(po.totalAmount),
      description: `Purchase Order ${po.poNumber} - ${po.supplierName}`,
      suggestedLines: [
        {
          accountId: '1300',
          accountCode: '1300',
          accountName: 'Inventory',
          debit: Number(po.totalAmount),
          credit: 0,
          description: `Inventory ordered via PO ${po.poNumber}`,
        },
        {
          accountId: '2100',
          accountCode: '2100',
          accountName: 'Accounts Payable',
          debit: 0,
          credit: Number(po.totalAmount),
          description: `AP for PO ${po.poNumber}`,
        },
      ],
    });

    const poRepo = this.dataSource.getRepository(PurchaseOrderTypeOrmEntity);
    await poRepo.update(poId, { glPostingQueueId: glEntry.id });
  }

  private async generatePONumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;
    const repo = this.dataSource.getRepository(PurchaseOrderTypeOrmEntity);

    const result = await repo
      .createQueryBuilder('po')
      .select('po.poNumber', 'poNumber')
      .where('po.poNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('po.poNumber', 'DESC')
      .limit(1)
      .getRawOne();

    if (!result?.poNumber) return `${prefix}0001`;
    const seq = parseInt(result.poNumber.replace(prefix, ''), 10) + 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }
}
