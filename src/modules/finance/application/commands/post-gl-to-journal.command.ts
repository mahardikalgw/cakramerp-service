export class PostGlToJournalCommand {
  constructor(
    public readonly date: string,
    public readonly description: string,
    public readonly lines: {
      accountId: string
      debit: number
      credit: number
      description?: string
    }[],
  ) {}
}