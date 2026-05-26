export class LogMaintenanceCommand {
  constructor(
    public readonly type: string,
    public readonly description: string,
    public readonly cost?: number,
    public readonly performedBy?: string,
    public readonly nextMaintenanceDate?: string,
  ) {}
}