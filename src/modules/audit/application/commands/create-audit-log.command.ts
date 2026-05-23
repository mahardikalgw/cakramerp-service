export class CreateAuditLogCommand {
  constructor(
    public readonly userId: string,
    public readonly userName: string,
    public readonly action: string,
    public readonly module: string,
    public readonly recordId: string,
    public readonly ipAddress: string,
    public readonly payload?: any,
  ) {}
}
