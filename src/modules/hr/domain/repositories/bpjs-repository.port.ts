export const BPJS_REPOSITORY = Symbol('BPJS_REPOSITORY');

export interface BpjsRepositoryPort {
  findActiveEnrollments(): Promise<any[]>;
  findByEmployeeId(employeeId: string): Promise<any | null>;
}
