export const PAYROLL_SERVICE = Symbol('PAYROLL_SERVICE');

export interface PayrollServicePort {
  runPayroll(month: number, year: number): Promise<any>;
  getPayrollRun(id: string): Promise<any>;
  getPayrollRuns(filters?: any): Promise<{ data: any[]; total: number }>;
  confirmPayroll(id: string, userId: string): Promise<any>;
  postToGL(id: string, userId: string): Promise<any>;
}
