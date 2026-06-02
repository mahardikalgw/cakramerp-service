export class ManualReconciliationMatchCommand {
  constructor(
    public readonly bankStatementLineId: string,
    public readonly journalLineId: string,
  ) {}
}
