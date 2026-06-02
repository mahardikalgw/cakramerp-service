export class CreateJournalEntryCommand {
  constructor(
    public readonly date: string,
    public readonly description: string,
    public readonly lines: {
      accountId: string;
      debit: number;
      credit: number;
      description?: string;
    }[],
    public readonly reference?: string,
    public readonly segment?: string,
    public readonly projectId?: string,
    public readonly costCenter?: string,
  ) {}
}
