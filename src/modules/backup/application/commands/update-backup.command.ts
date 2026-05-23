export class UpdateBackupCommand {
  constructor(
    public readonly id: string,
    public readonly name?: string,
    public readonly schedule?: string,
    public readonly status?: string,
    public readonly retentionDays?: number,
  ) {}
}
