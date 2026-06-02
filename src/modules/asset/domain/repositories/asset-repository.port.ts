export const ASSET_REPOSITORY = Symbol('ASSET_REPOSITORY');

export interface AssetRepositoryPort {
  findAll(filters?: {
    search?: string;
    category?: string;
    status?: string;
    depreciationMethod?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }>;
  findById(id: string): Promise<any | null>;
  create(data: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  getLastAssetNumber(prefix: string): Promise<string | null>;
  getDepreciationHistory(assetId: string): Promise<any[]>;
  createDepreciation(data: any): Promise<any>;
  findAssetsDueForDepreciation(
    schedule: string,
    beforeDate: Date,
  ): Promise<any[]>;
}
