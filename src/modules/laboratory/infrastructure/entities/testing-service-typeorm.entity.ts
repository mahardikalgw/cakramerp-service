import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('testing_services')
export class TestingServiceTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  declare code: string;

  @Column({ type: 'varchar', length: 255 })
  declare name: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare unitPrice: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare measurementUnit: string;

  @Column({ type: 'text', nullable: true })
  declare description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare sni: string;

  @Column({ type: 'boolean', default: true })
  declare isActive: boolean;
}
