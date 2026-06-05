import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type JournalEntryStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'reversed';

export class JournalEntry extends BaseEntity {
  declare id: string;
  declare entryNumber: string;
  declare date: Date;
  declare description: string;
  declare reference?: string;
  declare status: JournalEntryStatus;
  declare projectId?: string;
  declare segment?: string;
  declare costCenter?: string;
  declare createdBy: string | undefined;
  declare approvedBy?: string;
  declare approvedAt?: Date;
  declare reversalOfId?: string;
  declare sourceType?: string;
  declare sourceId?: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<JournalEntry> & {
      entryNumber: string;
      date: Date;
      description: string;
    },
  ) {
    super();
    Object.assign(this, props);
    this.status = props.status ?? 'draft';
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }
}
