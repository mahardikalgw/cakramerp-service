export const EMPLOYEE_REPOSITORY = Symbol('EMPLOYEE_REPOSITORY');

export interface EmployeeRepositoryPort {
  findAll(filters?: {
    search?: string;
    employmentType?: string;
    siteId?: string;
    departmentId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }>;
  findById(id: string): Promise<any | null>;
  findActiveEmployees(siteId?: string, departmentId?: string): Promise<any[]>;
  create(data: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  getLastEmployeeNumber(prefix: string): Promise<string | null>;
  createDocument(data: any): Promise<any>;
  getDocuments(employeeId: string): Promise<any[]>;
  createHistoryEvent(data: any): Promise<any>;
  getHistory(employeeId: string): Promise<any[]>;
}
