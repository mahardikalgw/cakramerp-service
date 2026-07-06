import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('departments')
export class DepartmentTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  declare name: string;

  @Column({ type: 'text', nullable: true })
  declare description: string;

  @Column({ type: 'boolean', default: true })
  declare isActive: boolean;
}
