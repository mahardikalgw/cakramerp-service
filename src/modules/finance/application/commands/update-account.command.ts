import type { AccountType } from '../../domain/entities/account.entity';

export class UpdateAccountCommand {
  constructor(
    public readonly code?: string,
    public readonly name?: string,
    public readonly type?: AccountType,
    public readonly taxCategory?: string,
    public readonly segment?: string,
    public readonly costCenter?: string,
    public readonly parentId?: string,
  ) {}
}
