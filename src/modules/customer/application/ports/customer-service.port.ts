export const CUSTOMER_SERVICE = Symbol('CUSTOMER_SERVICE');

export interface CustomerServicePort {
  findAll(filters?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: import('../../domain/entities/customer.entity').Customer[];
    total: number;
  }>;
  findById(
    id: string,
  ): Promise<import('../../domain/entities/customer.entity').Customer | null>;
  create(
    command: import('../commands/create-customer.command').CreateCustomerCommand,
  ): Promise<import('../../domain/entities/customer.entity').Customer>;
  update(
    id: string,
    command: import('../commands/update-customer.command').UpdateCustomerCommand,
  ): Promise<import('../../domain/entities/customer.entity').Customer>;
  delete(id: string): Promise<void>;
}
