export const MY_PAYSLIP_SERVICE = Symbol('MY_PAYSLIP_SERVICE');

export interface MyPayslipServicePort {
  getPayslips(employeeId: string): Promise<any[]>;
  downloadPayslip(employeeId: string, payrollId: string): Promise<string>;
  getTaxYtdSummary(employeeId: string, year: number): Promise<any>;
  downloadBuktiPotong(employeeId: string, year: number): Promise<string>;
}
