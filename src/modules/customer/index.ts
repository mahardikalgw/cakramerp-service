export { CustomerModule } from './customer.module';
export {
  CUSTOMER_SERVICE,
  type CustomerServicePort,
} from './application/ports/customer-service.port';
export { CreateCustomerCommand } from './application/commands/create-customer.command';
export { UpdateCustomerCommand } from './application/commands/update-customer.command';
export { Customer } from './domain/entities/customer.entity';
export {
  CUSTOMER_REPOSITORY,
  type CustomerRepositoryPort,
} from './domain/repositories/customer-repository.port';
