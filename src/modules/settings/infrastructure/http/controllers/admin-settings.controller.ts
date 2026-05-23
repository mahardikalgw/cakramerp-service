import { Controller, Get, Put, Body, Inject, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../iam/infrastructure/guards/roles.guard';
import { PermissionsGuard } from '../../../../iam/infrastructure/guards/permissions.guard';
import { Roles } from '../../../../iam/infrastructure/decorators/roles.decorator';
import { Permissions } from '../../../../iam/infrastructure/decorators/permissions.decorator';
import type { SettingsServicePort } from '../../../application/ports/settings-service.port';
import { SETTINGS_SERVICE } from '../../../application/ports/settings-service.port';
import { UpdateSettingsHttpDto } from '../dtos/update-settings.dto';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdminSettingsController {
  constructor(
    @Inject(SETTINGS_SERVICE)
    private readonly settingsService: SettingsServicePort,
  ) {}

  @Get()
  @Roles('admin')
  @Permissions('settings:read')
  async getSettings() {
    const companyProfile =
      await this.settingsService.getSettingsByCategory('company');
    const systemSettings =
      await this.settingsService.getSettingsByCategory('system');
    return {
      companyProfile,
      systemSettings,
    };
  }

  @Put()
  @Roles('admin')
  @Permissions('settings:write')
  async updateSettings(@Body() dto: UpdateSettingsHttpDto) {
    const settings: Record<string, { value: string; category: string }> = {};

    for (const [key, value] of Object.entries(dto.companyProfile || {})) {
      settings[key] = { value: String(value), category: 'company' };
    }

    for (const [key, value] of Object.entries(dto.systemSettings || {})) {
      settings[key] = { value: String(value), category: 'system' };
    }

    const command = { settings };
    await this.settingsService.updateSettings(command);
    return { message: 'Settings updated successfully' };
  }
}
