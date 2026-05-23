import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { Settings } from '../entities/settings.entity';

export const SETTINGS_REPOSITORY = Symbol('SETTINGS_REPOSITORY');

export interface SettingsRepositoryPort extends RepositoryPort<Settings> {
  findByKey(key: string): Promise<Settings | null>;
  findByCategory(category: string): Promise<Settings[]>;
}
