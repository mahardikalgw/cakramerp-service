import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('testing_parameters')
export class TestingParameterTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'uuid' })
  declare testingServiceId: string;

  @Column({ type: 'varchar', length: 255 })
  declare name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare standard: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare unit: string;

  @Column({ type: 'boolean', default: true })
  declare isActive: boolean;
}
