export const BPJS_SERVICE = Symbol('BPJS_SERVICE');

export interface BpjsServicePort {
  generateReport(month: number, year: number): Promise<any>;
  exportReport(month: number, year: number): Promise<string>;
}
