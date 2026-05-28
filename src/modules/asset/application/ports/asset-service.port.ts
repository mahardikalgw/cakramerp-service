export const ASSET_SERVICE = Symbol('ASSET_SERVICE')

export interface AssetServicePort {
  findAll(filters?: any): Promise<{ data: any[]; total: number }>
  findById(id: string): Promise<any>
  create(dto: any): Promise<any>
  update(id: string, dto: any): Promise<any>
  delete(id: string): Promise<void>
  getDepreciationHistory(assetId: string): Promise<any[]>
  calculateDepreciation(assetId: string, unitsProduced?: number): Promise<any>
  runScheduledDepreciation(schedule: string): Promise<any>
}
