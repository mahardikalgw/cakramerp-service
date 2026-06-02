export class UpdateEquipmentCommand {
  constructor(
    public readonly name?: string,
    public readonly type?: string,
    public readonly siteId?: string,
    public readonly serialNumber?: string,
    public readonly status?: string,
    public readonly purchaseDate?: string,
  ) {}
}
