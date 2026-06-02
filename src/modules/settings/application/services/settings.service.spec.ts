import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { SETTINGS_REPOSITORY } from '../../domain/repositories/settings-repository.port';
import { Settings } from '../../domain/entities/settings.entity';
import { UpdateSettingsCommand } from '../commands/update-settings.command';

describe('SettingsService', () => {
  let service: SettingsService;

  const mockRepo = {
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
    saveMany: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    findByKey: jest.fn(),
    findByCategory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: SETTINGS_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(SettingsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSettingsByCategory', () => {
    it('should return settings as key-value record', async () => {
      const settings = [
        new Settings({
          id: '1',
          key: 'site_name',
          value: 'My App',
          category: 'general',
        }),
        new Settings({
          id: '2',
          key: 'site_url',
          value: 'https://example.com',
          category: 'general',
        }),
      ];
      mockRepo.findByCategory.mockResolvedValue(settings);

      const result = await service.getSettingsByCategory('general');

      expect(result).toEqual({
        site_name: 'My App',
        site_url: 'https://example.com',
      });
      expect(mockRepo.findByCategory).toHaveBeenCalledWith('general');
    });

    it('should return empty record when no settings found', async () => {
      mockRepo.findByCategory.mockResolvedValue([]);

      const result = await service.getSettingsByCategory('nonexistent');

      expect(result).toEqual({});
    });
  });

  describe('getSettingByKey', () => {
    it('should return setting value by key', async () => {
      const setting = new Settings({
        id: '1',
        key: 'site_name',
        value: 'My App',
        category: 'general',
      });
      mockRepo.findByKey.mockResolvedValue(setting);

      const result = await service.getSettingByKey('site_name');

      expect(result).toBe('My App');
      expect(mockRepo.findByKey).toHaveBeenCalledWith('site_name');
    });

    it('should return null if setting not found', async () => {
      mockRepo.findByKey.mockResolvedValue(null);

      const result = await service.getSettingByKey('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateSettings', () => {
    it('should update existing settings', async () => {
      const existing = new Settings({
        id: '1',
        key: 'site_name',
        value: 'Old Name',
        category: 'general',
      });
      const command = new UpdateSettingsCommand({
        site_name: { value: 'New Name', category: 'general' },
      });
      mockRepo.findByKey.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(existing);

      await service.updateSettings(command);

      expect(mockRepo.findByKey).toHaveBeenCalledWith('site_name');
      expect(mockRepo.save).toHaveBeenCalled();
      expect(existing.value).toBe('New Name');
      expect(existing.category).toBe('general');
    });

    it('should create new settings when key does not exist', async () => {
      const command = new UpdateSettingsCommand({
        new_key: { value: 'new_value', category: 'new_category' },
      });
      mockRepo.findByKey.mockResolvedValue(null);
      mockRepo.save.mockImplementation(async (entity) => entity);

      await service.updateSettings(command);

      expect(mockRepo.findByKey).toHaveBeenCalledWith('new_key');
      expect(mockRepo.save).toHaveBeenCalled();
      const savedEntity = mockRepo.save.mock.calls[0][0];
      expect(savedEntity.key).toBe('new_key');
      expect(savedEntity.value).toBe('new_value');
      expect(savedEntity.category).toBe('new_category');
    });

    it('should handle multiple settings at once', async () => {
      const existing1 = new Settings({
        id: '1',
        key: 'key1',
        value: 'old1',
        category: 'cat1',
      });
      const command = new UpdateSettingsCommand({
        key1: { value: 'new1', category: 'cat1' },
        key2: { value: 'val2', category: 'cat2' },
      });
      mockRepo.findByKey
        .mockResolvedValueOnce(existing1)
        .mockResolvedValueOnce(null);
      mockRepo.save.mockImplementation(async (entity) => entity);

      await service.updateSettings(command);

      expect(mockRepo.findByKey).toHaveBeenCalledTimes(2);
      expect(mockRepo.save).toHaveBeenCalledTimes(2);
      expect(existing1.value).toBe('new1');
    });
  });
});
