import { UpdateSettingsCommand } from '../commands/update-settings.command';

export const SETTINGS_SERVICE = Symbol('SETTINGS_SERVICE');

export interface SettingsServicePort {
  getSettingsByCategory(category: string): Promise<Record<string, string>>;
  getSettingByKey(key: string): Promise<string | null>;
  updateSettings(command: UpdateSettingsCommand): Promise<void>;
}
