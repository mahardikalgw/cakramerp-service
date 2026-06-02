export class CreateSupplierCommand {
  constructor(
    public readonly name: string,
    public readonly email?: string,
    public readonly phone?: string,
    public readonly address?: string,
    public readonly city?: string,
    public readonly contactPerson?: string,
    public readonly taxId?: string,
    public readonly bankAccount?: string,
    public readonly bankName?: string,
    public readonly notes?: string,
  ) {}
}
