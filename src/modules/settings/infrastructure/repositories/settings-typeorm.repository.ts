import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Settings } from '../../domain/entities/settings.entity';
import { SettingsRepositoryPort } from '../../domain/repositories/settings-repository.port';
import { SettingsTypeOrmEntity } from '../entities/settings-typeorm.entity';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';

@Injectable()
export class SettingsTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<Settings, SettingsTypeOrmEntity>
  implements SettingsRepositoryPort
{
  protected readonly repository: Repository<SettingsTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(SettingsTypeOrmEntity);
  }

  toDomain(entity: SettingsTypeOrmEntity): Settings {
    return new Settings({
      id: entity.id,
      key: entity.key,
      value: entity.value,
      category: entity.category,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: Settings): SettingsTypeOrmEntity {
    const entity = new SettingsTypeOrmEntity();
    entity.id = domain.id;
    entity.key = domain.key;
    entity.value = domain.value;
    entity.category = domain.category;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  async findByKey(key: string): Promise<Settings | null> {
    const entity = await this.repository.findOne({ where: { key } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByCategory(category: string): Promise<Settings[]> {
    const entities = await this.repository.find({ where: { category } });
    return entities.map((entity) => this.toDomain(entity));
  }
}
