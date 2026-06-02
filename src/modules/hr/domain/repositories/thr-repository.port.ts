export const THR_REPOSITORY = Symbol('THR_REPOSITORY');

export interface ThrRepositoryPort {
  findByYear(year: number): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  create(data: any): Promise<any>;
  createMany(data: any[]): Promise<any[]>;
  update(id: string, data: any): Promise<any>;
  deleteByYear(year: number): Promise<void>;
}
