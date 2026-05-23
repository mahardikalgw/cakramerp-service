import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('accounts')
export class AccountTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string

  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'varchar', length: 50 })
  type: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  taxCategory: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  segment: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  costCenter: string

  @Column({ type: 'uuid', nullable: true })
  parentId: string

  @Column({ type: 'boolean', default: true })
  isActive: boolean
}
