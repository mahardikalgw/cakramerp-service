import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { STOCK_ISSUANCE_REPOSITORY } from '../../domain/repositories/stock-issuance-repository.port'
import type { StockIssuanceRepositoryPort } from '../../domain/repositories/stock-issuance-repository.port'
import { STOCK_MOVEMENT_SERVICE } from '../ports/stock-movement-service.port'
import type { StockMovementServicePort } from '../ports/stock-movement-service.port'
import type { StockIssuanceServicePort } from '../ports/stock-issuance-service.port'

export interface CreateStockIssuanceDto {
  warehouseId: string
  destinationType: string
  destinationId: string
  destinationName: string
  issuanceDate: string
  lines: {
    itemId: string
    itemName: string
    quantity: number
    uom: string
  }[]
}

@Injectable()
export class StockIssuanceService implements StockIssuanceServicePort {
  constructor(
    @Inject(STOCK_ISSUANCE_REPOSITORY)
    private readonly stockIssuanceRepo: StockIssuanceRepositoryPort,
    @Inject(STOCK_MOVEMENT_SERVICE)
    private readonly stockMovementService: StockMovementServicePort,
  ) {}

  async create(dto: CreateStockIssuanceDto, userId: string): Promise<any> {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Stock issuance must have at least one line')
    }

    // Validate stock availability for each line
    for (const line of dto.lines) {
      const available = await this.stockMovementService.getStockBalance(line.itemId, dto.warehouseId)
      if (line.quantity > available) {
        throw new BadRequestException(
          `Insufficient stock for item "${line.itemName}". Available: ${available}, Requested: ${line.quantity}`,
        )
      }
    }

    const issuanceNumber = await this.generateIssuanceNumber()

    const savedIssuance = await this.stockIssuanceRepo.create({
      issuanceNumber,
      warehouseId: dto.warehouseId,
      destinationType: dto.destinationType,
      destinationId: dto.destinationId,
      destinationName: dto.destinationName,
      issuanceDate: new Date(dto.issuanceDate),
      status: 'confirmed',
      createdBy: userId,
    })

    const lines: any[] = []
    for (const line of dto.lines) {
      const savedLine = await this.stockIssuanceRepo.createLine({
        issuanceId: savedIssuance.id,
        itemId: line.itemId,
        itemName: line.itemName,
        quantity: line.quantity,
        uom: line.uom,
      })

      lines.push(savedLine)

      // Record stock movement (negative quantity for issuance)
      await this.stockMovementService.recordMovement({
        itemId: line.itemId,
        warehouseId: dto.warehouseId,
        movementType: 'issuance',
        quantity: -line.quantity,
        referenceType: 'stock_issuance',
        referenceId: savedIssuance.id,
        description: `ISS ${issuanceNumber} - ${line.itemName} to ${dto.destinationName}`,
        createdBy: userId,
      })
    }

    return { issuance: savedIssuance, lines }
  }

  async reverse(id: string, reason: string, userId: string): Promise<any> {
    const result = await this.stockIssuanceRepo.findById(id)
    if (!result) throw new BadRequestException('Stock issuance not found')

    const { issuance, lines } = result

    if (issuance.status === 'reversed') {
      throw new BadRequestException('Stock issuance is already reversed')
    }

    // Create reversal movements (positive quantity to restore stock)
    for (const line of lines) {
      await this.stockMovementService.recordMovement({
        itemId: line.itemId,
        warehouseId: issuance.warehouseId,
        movementType: 'issuance_reversal',
        quantity: Number(line.quantity),
        referenceType: 'stock_issuance',
        referenceId: id,
        description: `Reversal of ${issuance.issuanceNumber} - ${line.itemName}. Reason: ${reason}`,
        createdBy: userId,
      })
    }

    // Update issuance status
    return this.stockIssuanceRepo.update(id, {
      status: 'reversed',
      reversalReason: reason,
      reversedAt: new Date(),
    })
  }

  async findAll(filters?: {
    warehouseId?: string
    destinationType?: string
    page?: number
    limit?: number
  }): Promise<{ data: any[]; total: number }> {
    return this.stockIssuanceRepo.findAll(filters)
  }

  async findById(id: string): Promise<any | null> {
    return this.stockIssuanceRepo.findById(id)
  }

  private async generateIssuanceNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `ISS-${year}-`
    const lastNumber = await this.stockIssuanceRepo.getLastIssuanceNumber(prefix)

    if (!lastNumber) return `${prefix}0001`
    const seq = parseInt(lastNumber.replace(prefix, ''), 10) + 1
    return `${prefix}${seq.toString().padStart(4, '0')}`
  }
}
