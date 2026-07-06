import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('suppliers')
export class SupplierTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 255 })
  declare name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare phone: string;

  @Column({ type: 'text', nullable: true })
  declare address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare city: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare contactPerson: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare taxId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare bankAccount: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare bankName: string;

  @Column({ type: 'text', nullable: true })
  declare notes: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  declare status: string;
}
