import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('projects')
export class ProjectTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  declare name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  declare code: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare segment: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  declare status: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare budget: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare actualCost: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  declare completionPercent: number;

  @Column({ type: 'date' })
  declare startDate: Date;

  @Column({ type: 'date', nullable: true })
  declare endDate: Date;
}
