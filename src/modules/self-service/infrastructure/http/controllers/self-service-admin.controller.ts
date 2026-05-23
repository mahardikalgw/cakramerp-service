import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
  Inject,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard'
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard'
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator'
import { MY_OVERTIME_SERVICE } from '../../../application/ports/my-overtime-service.port'
import type { MyOvertimeServicePort } from '../../../application/ports/my-overtime-service.port'

@Controller('overtime-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SelfServiceAdminController {
  constructor(
    @Inject(MY_OVERTIME_SERVICE)
    private readonly overtimeService: MyOvertimeServicePort,
  ) {}

  @Get('pending')
  @RequirePermissions('overtime:approve')
  async getPendingForSupervisor(@Req() req: any) {
    const supervisorId = req.user.sub ?? req.user.id
    return this.overtimeService.getPendingForSupervisor(supervisorId)
  }

  @Patch(':id/approve')
  @RequirePermissions('overtime:approve')
  async approve(@Req() req: any, @Param('id') requestId: string) {
    const approverId = req.user.sub ?? req.user.id
    return this.overtimeService.approve(requestId, approverId)
  }

  @Patch(':id/reject')
  @RequirePermissions('overtime:approve')
  async reject(
    @Req() req: any,
    @Param('id') requestId: string,
    @Body('reason') reason: string,
  ) {
    const approverId = req.user.sub ?? req.user.id
    return this.overtimeService.reject(requestId, approverId, reason)
  }
}
