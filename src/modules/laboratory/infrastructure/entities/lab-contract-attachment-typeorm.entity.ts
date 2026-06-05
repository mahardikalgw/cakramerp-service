import { Entity, Column, ManyToOne } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { LabContractTypeOrmEntity } from './lab-contract-typeorm.entity';

@Entity('lab_contract_attachments')
export class LabContractAttachmentTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare labContractId: string;

  @Column({ type: 'varchar', length: 255 })
  declare fileName: string;

  @Column({ type: 'varchar', length: 500 })
  declare fileUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare fileType: string;

  @Column({ type: 'timestamp', nullable: true })
  declare uploadedAt: Date;

  @ManyToOne(() => LabContractTypeOrmEntity, (contract) => contract.attachments)
  labContract: LabContractTypeOrmEntity;
}
