import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { LabContract } from '../entities/lab-contract.entity';

export const LAB_CONTRACT_REPOSITORY = Symbol('LAB_CONTRACT_REPOSITORY');

export interface LabContractRepositoryPort extends RepositoryPort<LabContract> {
  findByContractNumber(contractNumber: string): Promise<LabContract | null>;
  getLastContractNumber(): Promise<string | null>;
  softDelete(id: string): Promise<void>;
}
