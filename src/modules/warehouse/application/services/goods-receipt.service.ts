import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { GOODS_RECEIPT_REPOSITORY } from '../../domain/repositories/goods-receipt-repository.port'
import type { GoodsReceiptRepositoryPort } from '../../domain/repositories/goods-receipt-repository.port'
import { STOCK_MOVEMENT_SERVICE } from '../ports/stock-movement-service.port'
import type { StockMovementServicePort } from '../ports/stock-movement-service.port'
import type { GoodsReceiptServicePort } from '../ports/goods-receipt-service.port'

export interface CreateGoodsReceiptDto {
  poId?: string
  warehouseId: string
  supplierId?: string
  vendorName: string
  receivedDate: string
  notes?: string
  lines: {
    itemId: string
    itemName: string
    poQty: number
    receivedQty: number
    uom: string
    remarks?: string
  }[]
}

@Injectable()
export class GoodsReceiptService implements GoodsReceiptServicePort {
  constructor(
    @Inject(GOODS_RECEIPT_REPOSITORY)
    private readonly goodsReceiptRepo: GoodsReceiptRepositoryPort,
    @Inject(STOCK_MOVEMENT_SERVICE)
    private readonly stockMovementService: StockMovementServicePort,
  ) {}

  async create(dto: CreateGoodsReceiptDto, userId: string): Promise<any> {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Goods receipt must have at least one line')
    }

    const grnNumber = await this.generateGrnNumber()

    const savedReceipt = await this.goodsReceiptRepo.create({
      grnNumber,
      poId: dto.poId,
      warehouseId: dto.warehouseId,
      supplierId: dto.supplierId,
      vendorName: dto.vendorName,
      receivedDate: new Date(dto.receivedDate),
      notes: dto.notes,
      status: 'confirmed',
      createdBy: userId,
    })

    const lines: any[] = []
    for (const line of dto.lines) {
      const discrepancyQty = line.poQty - line.receivedQty

      const savedLine = await this.goodsReceiptRepo.createLine({
        goodsReceiptId: savedReceipt.id,
        itemId: line.itemId,
        itemName: line.itemName,
        poQty: line.poQty,
        receivedQty: line.receivedQty,
        discrepancyQty,
        uom: line.uom,
        remarks: line.remarks,
      })

      lines.push(savedLine)

      // Record stock movement for each line
      await this.stockMovementService.recordMovement({
        itemId: line.itemId,
        warehouseId: dto.warehouseId,
        movementType: 'receipt',
        quantity: line.receivedQty,
        referenceType: 'goods_receipt',
        referenceId: savedReceipt.id,
        description: `GRN ${grnNumber} - ${line.itemName}`,
        createdBy: userId,
      })
    }

    return { receipt: savedReceipt, lines }
  }

  async findAll(filters?: {
    warehouseId?: string
    page?: number
    limit?: number
  }): Promise<{ data: any[]; total: number }> {
    return this.goodsReceiptRepo.findAll(filters)
  }

  async findById(id: string): Promise<any | null> {
    return this.goodsReceiptRepo.findById(id)
  }

  private async generateGrnNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `GRN-${year}-`
    const lastNumber = await this.goodsReceiptRepo.getLastGrnNumber(prefix)

    if (!lastNumber) return `${prefix}0001`
    const seq = parseInt(lastNumber.replace(prefix, ''), 10) + 1
    return `${prefix}${seq.toString().padStart(4, '0')}`
  }
}
