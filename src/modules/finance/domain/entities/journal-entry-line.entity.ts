import { Decimal } from 'decimal.js';

export class JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  debit: Decimal;
  credit: Decimal;
  description?: string;
  createdAt: Date;

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
