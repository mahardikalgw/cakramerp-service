export const POSITION_REPOSITORY = Symbol('POSITION_REPOSITORY');

export interface PositionRepositoryPort {
  findAll(filters?: {
    search?: string;
    departmentId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }>;
  findById(id: string): Promise<any | null>;
  findByNameAndDepartment(
    name: string,
    departmentId?: string,
  ): Promise<any | null>;
  create(data: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
}
