import { Entity, Column } from 'typeorm'
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity'

@Entity('gl_posting_queue')
export class GlPostingQueueTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50 })
  sourceType: string

  @Column({ type: 'uuid' })
  sourceId: string

  @Column({ type: 'varchar', length: 100 })
  sourceNumber: string

  @Column({ type: 'varchar', length: 50 })
  eventType: string

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number

  @Column({ type: 'text' })
  description: string

  @Column({ type: 'jsonb', nullable: true })
  suggestedLines: Record<string, unknown>[]

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: string

  @Column({ type: 'uuid', nullable: true })
  journalEntryId: string

  @Column({ type: 'uuid', nullable: true })
  postedBy: string

  @Column({ type: 'timestamp', nullable: true })
  postedAt: Date
}