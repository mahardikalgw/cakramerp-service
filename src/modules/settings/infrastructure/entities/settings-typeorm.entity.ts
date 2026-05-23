import { Entity, Column, Index } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('settings')
export class SettingsTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  category: string | null;
}
