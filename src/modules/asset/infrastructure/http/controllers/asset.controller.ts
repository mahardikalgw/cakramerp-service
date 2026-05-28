import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  Inject,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard'
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard'
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator'
import { ASSET_SERVICE } from '../../../application/ports/asset-service.port'
import type { AssetServicePort } from '../../../application/ports/asset-service.port'
import { CreateAssetHttpDto, UpdateAssetHttpDto, CalculateDepreciationHttpDto } from '../dtos/asset.dto'

@Controller('assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetController {
  constructor(
    @Inject(ASSET_SERVICE)
    private readonly assetService: AssetServicePort,
  ) {}

  @Get()
  @RequirePermissions('assets:read')
  async findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('depreciation_method') depreciationMethod?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.assetService.findAll({
      search,
      category,
      status,
      depreciationMethod,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  @Get(':id')
  @RequirePermissions('assets:read')
  async findById(@Param('id') id: string) {
    return this.assetService.findById(id)
  }

  @Post()
  @RequirePermissions('assets:create')
  async create(@Body() dto: CreateAssetHttpDto) {
    return this.assetService.create(dto)
  }

  @Put(':id')
  @RequirePermissions('assets:update')
  async update(@Param('id') id: string, @Body() dto: UpdateAssetHttpDto) {
    return this.assetService.update(id, dto)
  }

  @Delete(':id')
  @RequirePermissions('assets:delete')
  async delete(@Param('id') id: string) {
    return this.assetService.delete(id)
  }

  @Get(':id/depreciations')
  @RequirePermissions('assets:read')
  async getDepreciationHistory(@Param('id') id: string) {
    return this.assetService.getDepreciationHistory(id)
  }

  @Post(':id/depreciate')
  @RequirePermissions('assets:update')
  async calculateDepreciation(
    @Param('id') id: string,
    @Body() dto: CalculateDepreciationHttpDto,
  ) {
    return this.assetService.calculateDepreciation(id, dto.unitsProduced)
  }

  @Post('run-depreciation')
  @RequirePermissions('assets:update')
  async runScheduledDepreciation(@Query('schedule') schedule?: string) {
    const s = schedule || 'monthly'
    return this.assetService.runScheduledDepreciation(s)
  }
}
