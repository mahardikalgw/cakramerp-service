import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('payment_methods')
export class PaymentMethodTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 100 })
  declare name: string;

  @Column({ type: 'varchar', length: 20 })
  declare type: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare bankName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare accountNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare accountHolder: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare virtualAccountPattern: string;

  @Column({ type: 'boolean', default: true })
  declare isActive: boolean;
}
