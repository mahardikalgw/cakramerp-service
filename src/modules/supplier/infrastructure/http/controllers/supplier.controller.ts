import {
  Controller,
  Get,
  Post,
  Patch,
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
import { SUPPLIER_SERVICE } from '../../../application/ports/supplier-service.port'
import type {
  SupplierServicePort,
  CreateSupplierDto,
  UpdateSupplierDto,
} from '../../../application/ports/supplier-service.port'

@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupplierController {
  constructor(
    @Inject(SUPPLIER_SERVICE)
    private readonly supplierService: SupplierServicePort,
  ) {}

  @Get()
  @RequirePermissions('suppliers:read')
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.supplierService.findAll({
      search,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  @Get(':id')
  @RequirePermissions('suppliers:read')
  async findById(@Param('id') id: string) {
    return this.supplierService.findById(id)
  }

  @Post()
  @RequirePermissions('suppliers:create')
  async create(@Body() dto: CreateSupplierDto) {
    return this.supplierService.create(dto)
  }

  @Patch(':id')
  @RequirePermissions('suppliers:update')
  async update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.supplierService.update(id, dto)
  }

  @Delete(':id')
  @RequirePermissions('suppliers:delete')
  async delete(@Param('id') id: string) {
    return this.supplierService.delete(id)
  }
}
