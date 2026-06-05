import { Decimal } from 'decimal.js';

export class JournalEntryLine {
  declare id: string;
  declare journalEntryId: string;
  declare accountId: string;
  declare debit: Decimal;
  declare credit: Decimal;
  declare description?: string;
  declare createdAt: Date;

  constructor(
    props: Partial<JournalEntryLine> & {
      journalEntryId: string;
      accountId: string;
      debit: Decimal;
      credit: Decimal;
    },
  ) {
    Object.assign(this, props);
    this.createdAt = props.createdAt ?? new Date();
  }
}
