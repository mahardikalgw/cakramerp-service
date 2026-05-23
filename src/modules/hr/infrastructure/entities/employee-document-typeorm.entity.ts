import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('employee_documents')
export class EmployeeDocumentTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string

  @Column({ type: 'varchar', length: 100 })
  type: string

  @Column({ type: 'varchar', length: 255 })
  fileName: string

  @Column({ type: 'varchar', length: 500 })
  filePath: string

  @Column({ type: 'date', nullable: true })
  expiryDate: Date

  @Column({ type: 'timestamp', default: () => 'now()' })
  uploadedAt: Date
}
