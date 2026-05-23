export const PAYSLIP_SERVICE = Symbol('PAYSLIP_SERVICE')

export interface PaySlipServicePort {
  generatePaySlips(payrollRunId: string): Promise<any>
  getPaySlip(payrollRunId: string, employeeId: string): Promise<any>
  downloadAll(payrollRunId: string): Promise<string>
}
