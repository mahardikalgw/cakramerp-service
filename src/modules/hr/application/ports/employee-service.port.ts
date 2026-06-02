export const EMPLOYEE_SERVICE = Symbol('EMPLOYEE_SERVICE');

export interface EmployeeServicePort {
  findAll(filters?: any): Promise<{ data: any[]; total: number }>;
  findById(id: string): Promise<any>;
  create(dto: any): Promise<any>;
  update(id: string, dto: any): Promise<any>;
  uploadDocument(employeeId: string, dto: any): Promise<any>;
  getDocuments(employeeId: string): Promise<any[]>;
  getHistory(employeeId: string): Promise<any[]>;
}
