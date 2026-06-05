import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('bank_accounts')
export class BankAccountTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  declare bankName: string;

  @Column({ type: 'varchar', length: 100 })
  declare accountNumber: string;

  @Column({ type: 'varchar', length: 255 })
  declare accountName: string;

  @Column({ type: 'uuid', nullable: true })
  declare glAccountId: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare currentBalance: number;

  @Column({ type: 'boolean', default: true })
  declare isActive: boolean;
}
