import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { ClosingService } from '../../../application/services/closing.service';
import {
  CreateClosingHttpDto,
  CompleteChecklistItemHttpDto,
  ExecuteClosingHttpDto,
} from '../../http/dtos/closing.dto';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClosingController {
  constructor(private readonly closingService: ClosingService) {}

  @Get('closings')
  @RequirePermissions('contracts:read')
  async listClosings(
    @Query('entityType') entityType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.closingService.findAll({
      entityType,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('closings/:id')
  @RequirePermissions('contracts:read')
  async getClosing(@Param('id') id: string) {
    return this.closingService.findById(id);
  }

  @Post('closings')
  @RequirePermissions('contracts:approve')
  async initiateClosing(@Body() dto: CreateClosingHttpDto, @Req() req: any) {
    return this.closingService.initiateClosing(
      dto.entityType,
      dto.entityId,
      req.user?.id ?? 'unknown',
      req.user?.name,
    );
  }

  @Patch('closings/:id/complete-item')
  @RequirePermissions('contracts:approve')
  async completeItem(
    @Param('id') id: string,
    @Body() dto: CompleteChecklistItemHttpDto,
    @Req() req: any,
  ) {
    return this.closingService.completeChecklistItem(
      id,
      dto.itemIndex,
      req.user?.id ?? 'unknown',
      dto.notes,
    );
  }

  @Patch('closings/:id/execute')
  @RequirePermissions('contracts:approve')
  async executeClosing(
    @Param('id') id: string,
    @Body() dto: ExecuteClosingHttpDto,
    @Req() req: any,
  ) {
    return this.closingService.executeClosing(
      id,
      req.user?.id ?? 'unknown',
      req.user?.name,
      dto.closingReason,
    );
  }

  @Patch('closings/:id/cancel')
  @RequirePermissions('contracts:approve')
  async cancelClosing(@Param('id') id: string) {
    return this.closingService.cancelClosing(id);
  }
}
