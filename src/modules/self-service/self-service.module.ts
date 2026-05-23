import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

// TypeORM entities (self-service)
import { ProfileChangeRequestTypeOrmEntity } from './infrastructure/entities/profile-change-request-typeorm.entity'
import { DiscrepancyReportTypeOrmEntity } from './infrastructure/entities/discrepancy-report-typeorm.entity'
import { LeaveTypeTypeOrmEntity } from './infrastructure/entities/leave-type-typeorm.entity'
import { LeaveBalanceTypeOrmEntity } from './infrastructure/entities/leave-balance-typeorm.entity'
import { LeaveRequestTypeOrmEntity } from './infrastructure/entities/leave-request-typeorm.entity'
import { ShiftScheduleTypeOrmEntity } from './infrastructure/entities/shift-schedule-typeorm.entity'
import { OvertimeRequestTypeOrmEntity } from './infrastructure/entities/overtime-request-typeorm.entity'

// Repositories
import { ProfileChangeRequestTypeOrmRepository } from './infrastructure/repositories/profile-change-request-typeorm.repository'
import { DiscrepancyReportTypeOrmRepository } from './infrastructure/repositories/discrepancy-report-typeorm.repository'
import { LeaveTypeTypeOrmRepository } from './infrastructure/repositories/leave-type-typeorm.repository'
import { LeaveBalanceTypeOrmRepository } from './infrastructure/repositories/leave-balance-typeorm.repository'
import { LeaveRequestTypeOrmRepository } from './infrastructure/repositories/leave-request-typeorm.repository'
import { ShiftScheduleTypeOrmRepository } from './infrastructure/repositories/shift-schedule-typeorm.repository'
import { OvertimeRequestTypeOrmRepository } from './infrastructure/repositories/overtime-request-typeorm.repository'

// Repository symbols
import {
  PROFILE_CHANGE_REQUEST_REPOSITORY,
  DISCREPANCY_REPORT_REPOSITORY,
  LEAVE_TYPE_REPOSITORY,
  LEAVE_BALANCE_REPOSITORY,
  LEAVE_REQUEST_REPOSITORY,
  SHIFT_SCHEDULE_REPOSITORY,
  OVERTIME_REQUEST_REPOSITORY,
} from './domain/repositories/self-service-repository.port'

// Service implementations
import { MyProfileService } from './application/services/my-profile.service'
import { MyAttendanceService } from './application/services/my-attendance.service'
import { MyLeaveService } from './application/services/my-leave.service'
import { MyPayslipService } from './application/services/my-payslip.service'
import { MyScheduleService } from './application/services/my-schedule.service'
import { MyOvertimeService } from './application/services/my-overtime.service'

// Service port symbols
import { MY_PROFILE_SERVICE } from './application/ports/my-profile-service.port'
import { MY_ATTENDANCE_SERVICE } from './application/ports/my-attendance-service.port'
import { MY_LEAVE_SERVICE } from './application/ports/my-leave-service.port'
import { MY_PAYSLIP_SERVICE } from './application/ports/my-payslip-service.port'
import { MY_SCHEDULE_SERVICE } from './application/ports/my-schedule-service.port'
import { MY_OVERTIME_SERVICE } from './application/ports/my-overtime-service.port'

// Controllers
import { SelfServiceController } from './infrastructure/http/controllers/self-service.controller'
import { SelfServiceAdminController } from './infrastructure/http/controllers/self-service-admin.controller'

// Auth module for guards
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProfileChangeRequestTypeOrmEntity,
      DiscrepancyReportTypeOrmEntity,
      LeaveTypeTypeOrmEntity,
      LeaveBalanceTypeOrmEntity,
      LeaveRequestTypeOrmEntity,
      ShiftScheduleTypeOrmEntity,
      OvertimeRequestTypeOrmEntity,
    ]),
    AuthModule,
  ],
  controllers: [SelfServiceController, SelfServiceAdminController],
  providers: [
    // Repositories
    {
      provide: PROFILE_CHANGE_REQUEST_REPOSITORY,
      useClass: ProfileChangeRequestTypeOrmRepository,
    },
    {
      provide: DISCREPANCY_REPORT_REPOSITORY,
      useClass: DiscrepancyReportTypeOrmRepository,
    },
    {
      provide: LEAVE_TYPE_REPOSITORY,
      useClass: LeaveTypeTypeOrmRepository,
    },
    {
      provide: LEAVE_BALANCE_REPOSITORY,
      useClass: LeaveBalanceTypeOrmRepository,
    },
    {
      provide: LEAVE_REQUEST_REPOSITORY,
      useClass: LeaveRequestTypeOrmRepository,
    },
    {
      provide: SHIFT_SCHEDULE_REPOSITORY,
      useClass: ShiftScheduleTypeOrmRepository,
    },
    {
      provide: OVERTIME_REQUEST_REPOSITORY,
      useClass: OvertimeRequestTypeOrmRepository,
    },
    // Services
    {
      provide: MY_PROFILE_SERVICE,
      useClass: MyProfileService,
    },
    {
      provide: MY_ATTENDANCE_SERVICE,
      useClass: MyAttendanceService,
    },
    {
      provide: MY_LEAVE_SERVICE,
      useClass: MyLeaveService,
    },
    {
      provide: MY_PAYSLIP_SERVICE,
      useClass: MyPayslipService,
    },
    {
      provide: MY_SCHEDULE_SERVICE,
      useClass: MyScheduleService,
    },
    {
      provide: MY_OVERTIME_SERVICE,
      useClass: MyOvertimeService,
    },
  ],
  exports: [
    MY_PROFILE_SERVICE,
    MY_ATTENDANCE_SERVICE,
    MY_LEAVE_SERVICE,
    MY_PAYSLIP_SERVICE,
    MY_SCHEDULE_SERVICE,
    MY_OVERTIME_SERVICE,
  ],
})
export class SelfServiceModule {}
