export class CreateBackupHttpDto {
  name: string;
  schedule: string;
  retentionDays?: number;
}
