import { Inject, Injectable } from '@nestjs/common';
import { Settings } from '../../domain/entities/settings.entity';
import type { SettingsRepositoryPort } from '../../domain/repositories/settings-repository.port';
import { SETTINGS_REPOSITORY } from '../../domain/repositories/settings-repository.port';
import { UpdateSettingsCommand } from '../commands/update-settings.command';
import { SettingsServicePort } from '../ports/settings-service.port';

@Injectable()
export class SettingsService implements SettingsServicePort {
  constructor(
    @Inject(SETTINGS_REPOSITORY)
    private readonly settingsRepository: SettingsRepositoryPort,
  ) {}

  async getSettingsByCategory(
    category: string,
  ): Promise<Record<string, string>> {
    const settings = await this.settingsRepository.findByCategory(category);
    const result: Record<string, string> = {};
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }
    return result;
  }

  async getSettingByKey(key: string): Promise<string | null> {
    const setting = await this.settingsRepository.findByKey(key);
    return setting?.value || null;
  }

  async updateSettings(command: UpdateSettingsCommand): Promise<void> {
    for (const [key, data] of Object.entries(command.settings)) {
      const existing = await this.settingsRepository.findByKey(key);
      if (existing) {
        existing.value = data.value;
        existing.category = data.category;
        await this.settingsRepository.save(existing);
      } else {
        const newSetting = new Settings({
          key,
          value: data.value,
          category: data.category,
        });
        await this.settingsRepository.save(newSetting);
      }
    }
  }
}
