import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('employee_documents')
export class EmployeeDocumentTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare employeeId: string;

  @Column({ type: 'varchar', length: 100 })
  declare type: string;

  @Column({ type: 'varchar', length: 255 })
  declare fileName: string;

  @Column({ type: 'varchar', length: 500 })
  declare filePath: string;

  @Column({ type: 'date', nullable: true })
  declare expiryDate: Date;

  @Column({ type: 'timestamp', default: () => 'now()' })
  uploadedAt: Date;
}
