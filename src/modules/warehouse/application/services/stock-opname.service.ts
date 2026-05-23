import { Injectable, Inject, BadRequestException } from '@nestjs/common'
import { STOCK_OPNAME_REPOSITORY } from '../../domain/repositories/stock-opname-repository.port'
import type { StockOpnameRepositoryPort } from '../../domain/repositories/stock-opname-repository.port'
import { STOCK_MOVEMENT_SERVICE } from '../ports/stock-movement-service.port'
import type { StockMovementServicePort } from '../ports/stock-movement-service.port'
import type { StockOpnameServicePort } from '../ports/stock-opname-service.port'

@Injectable()
export class StockOpnameService implements StockOpnameServicePort {
  constructor(
    @Inject(STOCK_OPNAME_REPOSITORY)
    private readonly stockOpnameRepo: StockOpnameRepositoryPort,
    @Inject(STOCK_MOVEMENT_SERVICE)
    private readonly stockMovementService: StockMovementServicePort,
  ) {}

  async create(warehouseId: string, userId: string): Promise<any> {
    // Get balances for warehouse (validates warehouse exists via repo)
    const balances = await this.stockOpnameRepo.getBalancesForWarehouse(warehouseId)

    const savedSession = await this.stockOpnameRepo.createSession({
      warehouseId,
      conductedBy: userId,
      status: 'draft',
    })

    const lines: any[] = []
    for (const balance of balances) {
      const savedLine = await this.stockOpnameRepo.createLine({
        sessionId: savedSession.id,
        itemId: balance.itemId,
        itemName: balance.itemName,
        systemQty: balance.quantity,
        actualQty: 0,
        varianceQty: 0,
        uom: balance.uom,
      })

      lines.push(savedLine)
    }

    return { session: savedSession, lines }
  }

  async updateCounts(
    sessionId: string,
    lines: { itemId: string; actualQty: number }[],
  ): Promise<any[]> {
    const session = await this.stockOpnameRepo.findSessionById(sessionId)
    if (!session) throw new BadRequestException('Stock opname session not found')
    if (session.status !== 'draft') {
      throw new BadRequestException('Can only update counts for draft sessions')
    }

    const updatedLines: any[] = []

    for (const input of lines) {
      const line = await this.stockOpnameRepo.findLineBySessionAndItem(sessionId, input.itemId)
      if (!line) {
        throw new BadRequestException(`Item ${input.itemId} not found in session`)
      }

      const updatedLine = await this.stockOpnameRepo.updateLine(line.id, {
        actualQty: input.actualQty,
        varianceQty: input.actualQty - Number(line.systemQty),
      })

      updatedLines.push(updatedLine)
    }

    return updatedLines
  }

  async submit(sessionId: string): Promise<any> {
    const session = await this.stockOpnameRepo.findSessionById(sessionId)
    if (!session) throw new BadRequestException('Stock opname session not found')
    if (session.status !== 'draft') {
      throw new BadRequestException('Only draft sessions can be submitted')
    }

    return this.stockOpnameRepo.updateSession(sessionId, {
      status: 'pending_approval',
      submittedAt: new Date(),
    })
  }

  async approve(sessionId: string, userId: string): Promise<any> {
    const session = await this.stockOpnameRepo.findSessionById(sessionId)
    if (!session) throw new BadRequestException('Stock opname session not found')
    if (session.status !== 'pending_approval') {
      throw new BadRequestException('Only pending sessions can be approved')
    }

    // Apply adjustments for lines with variance
    const lines = await this.stockOpnameRepo.findLinesBySessionId(sessionId)

    for (const line of lines) {
      const variance = Number(line.varianceQty)
      if (variance !== 0) {
        await this.stockMovementService.recordMovement({
          itemId: line.itemId,
          warehouseId: session.warehouseId,
          movementType: 'adjustment',
          quantity: variance,
          referenceType: 'stock_opname',
          referenceId: sessionId,
          description: `Stock opname adjustment - ${line.itemName} (variance: ${variance})`,
          createdBy: userId,
        })
      }
    }

    return this.stockOpnameRepo.updateSession(sessionId, {
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date(),
    })
  }

  async findAll(filters?: {
    warehouseId?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: any[]; total: number }> {
    return this.stockOpnameRepo.findAll(filters)
  }

  async findById(id: string): Promise<any | null> {
    return this.stockOpnameRepo.findById(id)
  }
}
