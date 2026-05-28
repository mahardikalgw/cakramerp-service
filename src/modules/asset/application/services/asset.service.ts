import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common'
import { ASSET_REPOSITORY } from '../../domain/repositories/asset-repository.port'
import type { AssetRepositoryPort } from '../../domain/repositories/asset-repository.port'
import { GL_POSTING_QUEUE_SERVICE } from '../../../finance/application/ports/gl-posting-queue-service.port'
import type { GlPostingQueueServicePort } from '../../../finance/application/ports/gl-posting-queue-service.port'
import type { AssetServicePort } from '../ports/asset-service.port'

@Injectable()
export class AssetService implements AssetServicePort {
  constructor(
    @Inject(ASSET_REPOSITORY)
    private readonly assetRepo: AssetRepositoryPort,
    @Inject(GL_POSTING_QUEUE_SERVICE)
    private readonly glPostingQueueService: GlPostingQueueServicePort,
  ) {}

  async findAll(filters?: any): Promise<{ data: any[]; total: number }> {
    return this.assetRepo.findAll(filters)
  }

  async findById(id: string): Promise<any> {
    const asset = await this.assetRepo.findById(id)
    if (!asset) throw new NotFoundException('Asset not found')
    return asset
  }

  async create(data: any): Promise<any> {
    const assetNumber = await this.generateAssetNumber()

    // Set initial book value = acquisition cost
    const currentBookValue = data.acquisitionCost

    // Default declining balance rate if not provided: 2 / useful life in years
    let decliningBalanceRate = data.decliningBalanceRate
    if (data.depreciationMethod === 'declining_balance' && !decliningBalanceRate) {
      const usefulLifeYears = data.usefulLifeMonths / 12
      decliningBalanceRate = usefulLifeYears > 0 ? 2 / usefulLifeYears : 0
    }

    // Validate unit production method has total units
    if (data.depreciationMethod === 'unit_production' && !data.totalEstimatedUnits) {
      throw new BadRequestException('Total estimated units is required for unit production method')
    }

    return this.assetRepo.create({
      assetNumber,
      name: data.name,
      description: data.description,
      category: data.category,
      acquisitionDate: new Date(data.acquisitionDate),
      acquisitionCost: data.acquisitionCost,
      salvageValue: data.salvageValue ?? 0,
      usefulLifeMonths: data.usefulLifeMonths,
      depreciationMethod: data.depreciationMethod,
      decliningBalanceRate,
      totalEstimatedUnits: data.totalEstimatedUnits,
      unitsProducedToDate: 0,
      currentBookValue,
      accumulatedDepreciation: 0,
      depreciationSchedule: data.depreciationSchedule ?? 'monthly',
      lastDepreciationDate: null,
      status: 'active',
      location: data.location,
      assignedToEmployeeId: data.assignedToEmployeeId,
      notes: data.notes,
    })
  }

  async update(id: string, data: any): Promise<any> {
    const asset = await this.assetRepo.findById(id)
    if (!asset) throw new NotFoundException('Asset not found')

    // Recalculate declining balance rate if method changed
    if (data.depreciationMethod === 'declining_balance' && !data.decliningBalanceRate) {
      const months = data.usefulLifeMonths ?? asset.usefulLifeMonths
      const usefulLifeYears = months / 12
      data.decliningBalanceRate = usefulLifeYears > 0 ? 2 / usefulLifeYears : 0
    }

    if (data.depreciationMethod === 'unit_production') {
      const totalUnits = data.totalEstimatedUnits ?? asset.totalEstimatedUnits
      if (!totalUnits) {
        throw new BadRequestException('Total estimated units is required for unit production method')
      }
    }

    return this.assetRepo.update(id, data)
  }

  async delete(id: string): Promise<void> {
    const asset = await this.assetRepo.findById(id)
    if (!asset) throw new NotFoundException('Asset not found')
    await this.assetRepo.delete(id)
  }

  async getDepreciationHistory(assetId: string): Promise<any[]> {
    const asset = await this.assetRepo.findById(assetId)
    if (!asset) throw new NotFoundException('Asset not found')
    return this.assetRepo.getDepreciationHistory(assetId)
  }

  async calculateDepreciation(assetId: string, unitsProduced?: number): Promise<any> {
    const asset = await this.assetRepo.findById(assetId)
    if (!asset) throw new NotFoundException('Asset not found')

    if (asset.status !== 'active') {
      throw new BadRequestException('Cannot depreciate an inactive or disposed asset')
    }

    if (Number(asset.currentBookValue) <= Number(asset.salvageValue)) {
      throw new BadRequestException('Asset is already fully depreciated')
    }

    let depreciationAmount: number

    switch (asset.depreciationMethod) {
      case 'straight_line':
        depreciationAmount = this.calculateStraightLine(asset)
        break
      case 'declining_balance':
        depreciationAmount = this.calculateDecliningBalance(asset)
        break
      case 'unit_production':
        if (!unitsProduced || unitsProduced <= 0) {
          throw new BadRequestException('Units produced is required for unit production method')
        }
        depreciationAmount = this.calculateUnitProduction(asset, unitsProduced)
        break
      default:
        throw new BadRequestException(`Unknown depreciation method: ${asset.depreciationMethod}`)
    }

    // Ensure we don't depreciate below salvage value
    const maxDepreciation = Number(asset.currentBookValue) - Number(asset.salvageValue)
    depreciationAmount = Math.min(depreciationAmount, maxDepreciation)
    depreciationAmount = Math.round(depreciationAmount * 100) / 100

    if (depreciationAmount <= 0) {
      throw new BadRequestException('No depreciation to record — asset at salvage value')
    }

    const newAccumulatedDepreciation = Number(asset.accumulatedDepreciation) + depreciationAmount
    const newBookValue = Number(asset.currentBookValue) - depreciationAmount
    const today = new Date()

    // Record depreciation entry
    const depreciationEntry = await this.assetRepo.createDepreciation({
      assetId,
      periodDate: today,
      depreciationAmount,
      accumulatedDepreciation: newAccumulatedDepreciation,
      bookValueAfter: newBookValue,
      methodUsed: asset.depreciationMethod,
      unitsProduced: unitsProduced ?? null,
    })

    // Update asset
    const updateData: any = {
      currentBookValue: newBookValue,
      accumulatedDepreciation: newAccumulatedDepreciation,
      lastDepreciationDate: today,
    }

    if (asset.depreciationMethod === 'unit_production' && unitsProduced) {
      updateData.unitsProducedToDate = Number(asset.unitsProducedToDate) + unitsProduced
    }

    // Check if fully depreciated
    if (newBookValue <= Number(asset.salvageValue)) {
      updateData.status = 'fully_depreciated'
    }

    await this.assetRepo.update(assetId, updateData)

    // Auto-create GL Posting Queue entry for this depreciation
    const periodLabel = today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    await this.glPostingQueueService.createEntry({
      sourceType: 'asset_depreciation',
      sourceId: assetId,
      sourceNumber: asset.assetNumber,
      eventType: 'depreciation',
      amount: depreciationAmount,
      description: `Depreciation for ${asset.name} — ${periodLabel}`,
      suggestedLines: [
        {
          accountId: '',
          accountCode: '6xxx',
          accountName: 'Depreciation Expense',
          debit: depreciationAmount,
          credit: 0,
          description: `Depreciation - ${asset.name}`,
        },
        {
          accountId: '',
          accountCode: '1xxx',
          accountName: 'Accumulated Depreciation',
          debit: 0,
          credit: depreciationAmount,
          description: `Accumulated Depreciation - ${asset.name}`,
        },
      ],
    })

    return depreciationEntry
  }

  async runScheduledDepreciation(schedule: string): Promise<any> {
    const today = new Date()
    const assets = await this.assetRepo.findAssetsDueForDepreciation(schedule, today)

    const results = { processed: 0, skipped: 0, errors: [] as string[] }

    for (const asset of assets) {
      try {
        // Skip unit production — requires manual input
        if (asset.depreciationMethod === 'unit_production') {
          results.skipped++
          continue
        }

        // Check if depreciation is due based on schedule
        if (this.isDepreciationDue(asset, schedule, today)) {
          await this.calculateDepreciation(asset.id)
          results.processed++
        } else {
          results.skipped++
        }
      } catch (error: any) {
        results.errors.push(`${asset.assetNumber}: ${error.message}`)
        results.skipped++
      }
    }

    return results
  }

  // ─── Depreciation Calculation Methods ──────────────────────────────────────

  private calculateStraightLine(asset: any): number {
    // (Cost - Salvage) / Useful Life Months
    const depreciableAmount = Number(asset.acquisitionCost) - Number(asset.salvageValue)
    const monthlyDepreciation = depreciableAmount / asset.usefulLifeMonths

    // Adjust for schedule
    return this.adjustForSchedule(monthlyDepreciation, asset.depreciationSchedule)
  }

  private calculateDecliningBalance(asset: any): number {
    // Book Value * Rate / 12 (monthly) — rate is annual
    const rate = Number(asset.decliningBalanceRate) || (2 / (asset.usefulLifeMonths / 12))
    const annualDepreciation = Number(asset.currentBookValue) * rate
    const monthlyDepreciation = annualDepreciation / 12

    return this.adjustForSchedule(monthlyDepreciation, asset.depreciationSchedule)
  }

  private calculateUnitProduction(asset: any, unitsProduced: number): number {
    // (Cost - Salvage) * (Units Produced / Total Estimated Units)
    const depreciableAmount = Number(asset.acquisitionCost) - Number(asset.salvageValue)
    const totalUnits = Number(asset.totalEstimatedUnits)

    if (totalUnits <= 0) return 0

    return depreciableAmount * (unitsProduced / totalUnits)
  }

  private adjustForSchedule(monthlyAmount: number, schedule: string): number {
    switch (schedule) {
      case 'monthly':
        return monthlyAmount
      case 'quarterly':
        return monthlyAmount * 3
      case 'yearly':
        return monthlyAmount * 12
      default:
        return monthlyAmount
    }
  }

  private isDepreciationDue(asset: any, schedule: string, today: Date): boolean {
    if (!asset.lastDepreciationDate) return true

    const lastDate = new Date(asset.lastDepreciationDate)
    const diffMs = today.getTime() - lastDate.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    switch (schedule) {
      case 'monthly':
        return diffDays >= 28
      case 'quarterly':
        return diffDays >= 85
      case 'yearly':
        return diffDays >= 360
      default:
        return diffDays >= 28
    }
  }

  private async generateAssetNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `AST-${year}-`
    const lastNumber = await this.assetRepo.getLastAssetNumber(prefix)

    if (!lastNumber) return `${prefix}0001`
    const seq = parseInt(lastNumber.replace(prefix, ''), 10) + 1
    return `${prefix}${seq.toString().padStart(4, '0')}`
  }
}
