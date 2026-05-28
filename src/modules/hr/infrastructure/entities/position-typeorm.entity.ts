import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('positions')
export class PositionTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'uuid', nullable: true })
  departmentId: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ type: 'boolean', default: true })
  isActive: boolean
}
