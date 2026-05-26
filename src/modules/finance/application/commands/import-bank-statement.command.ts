export class ImportBankStatementCommand {
  constructor(
    public readonly bankAccountId: string,
    public readonly periodStart: string,
    public readonly periodEnd: string,
    public readonly lines: {
      date: string
      description: string
      debit: number
      credit: number
      balance: number
      reference?: string
    }[],
  ) {}
}