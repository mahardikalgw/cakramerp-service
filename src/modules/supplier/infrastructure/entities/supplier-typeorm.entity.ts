import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('suppliers')
export class SupplierTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string

  @Column({ type: 'text', nullable: true })
  address: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactPerson: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  taxId: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankAccount: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankName: string

  @Column({ type: 'text', nullable: true })
  notes: string

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string
}
