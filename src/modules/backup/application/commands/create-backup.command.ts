export class CreateBackupCommand {
  constructor(
    public readonly name: string,
    public readonly schedule: string,
    public readonly retentionDays?: number,
  ) {}
}
