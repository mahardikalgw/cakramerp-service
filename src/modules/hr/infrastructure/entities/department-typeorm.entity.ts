import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('departments')
export class DepartmentTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  declare name: string;

  @Column({ type: 'text', nullable: true })
  declare description: string;

  @Column({ type: 'boolean', default: true })
  declare isActive: boolean;
}
