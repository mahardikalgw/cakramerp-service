import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrController } from './infrastructure/http/controllers/hr.controller';
import { FinanceModule } from '../finance/finance.module';
import { UserModule } from '../user/user.module';
import { EmployeeTypeOrmEntity } from './infrastructure/entities/employee-typeorm.entity';
import { EmployeeDocumentTypeOrmEntity } from './infrastructure/entities/employee-document-typeorm.entity';
import { EmployeeHistoryTypeOrmEntity } from './infrastructure/entities/employee-history-typeorm.entity';
import { AttendanceRecordTypeOrmEntity } from './infrastructure/entities/attendance-record-typeorm.entity';
import { PayrollRunTypeOrmEntity } from './infrastructure/entities/payroll-run-typeorm.entity';
import { PayrollDetailTypeOrmEntity } from './infrastructure/entities/payroll-detail-typeorm.entity';
import { ThrRecordTypeOrmEntity } from './infrastructure/entities/thr-record-typeorm.entity';
import { BpjsEnrollmentTypeOrmEntity } from './infrastructure/entities/bpjs-enrollment-typeorm.entity';
import { DepartmentTypeOrmEntity } from './infrastructure/entities/department-typeorm.entity';
import { PositionTypeOrmEntity } from './infrastructure/entities/position-typeorm.entity';

// Repository port symbols
import { EMPLOYEE_REPOSITORY } from './domain/repositories/employee-repository.port';
import { ATTENDANCE_REPOSITORY } from './domain/repositories/attendance-repository.port';
import { PAYROLL_REPOSITORY } from './domain/repositories/payroll-repository.port';
import { THR_REPOSITORY } from './domain/repositories/thr-repository.port';
import { BPJS_REPOSITORY } from './domain/repositories/bpjs-repository.port';
import { DEPARTMENT_REPOSITORY } from './domain/repositories/department-repository.port';
import { POSITION_REPOSITORY } from './domain/repositories/position-repository.port';

// Repository implementations
import { EmployeeTypeOrmRepository } from './infrastructure/repositories/employee-typeorm.repository';
import { AttendanceTypeOrmRepository } from './infrastructure/repositories/attendance-typeorm.repository';
import { PayrollTypeOrmRepository } from './infrastructure/repositories/payroll-typeorm.repository';
import { ThrTypeOrmRepository } from './infrastructure/repositories/thr-typeorm.repository';
import { BpjsTypeOrmRepository } from './infrastructure/repositories/bpjs-typeorm.repository';
import { DepartmentTypeOrmRepository } from './infrastructure/repositories/department-typeorm.repository';
import { PositionTypeOrmRepository } from './infrastructure/repositories/position-typeorm.repository';

// Service port symbols
import { EMPLOYEE_SERVICE } from './application/ports/employee-service.port';
import { ATTENDANCE_SERVICE } from './application/ports/attendance-service.port';
import { PAYROLL_SERVICE } from './application/ports/payroll-service.port';
import { PAYSLIP_SERVICE } from './application/ports/payslip-service.port';
import { BPJS_SERVICE } from './application/ports/bpjs-service.port';
import { THR_SERVICE } from './application/ports/thr-service.port';
import { DEPARTMENT_SERVICE } from './application/ports/department-service.port';
import { POSITION_SERVICE } from './application/ports/position-service.port';

// Service implementations
import { EmployeeService } from './application/services/employee.service';
import { AttendanceService } from './application/services/attendance.service';
import { PayrollEngineService } from './application/services/payroll-engine.service';
import { PaySlipService } from './application/services/payslip.service';
import { BpjsReportService } from './application/services/bpjs-report.service';
import { ThrService } from './application/services/thr.service';
import { DepartmentService } from './application/services/department.service';
import { PositionService } from './application/services/position.service';
import { HrFinanceAdapter } from './application/adapters/hr-finance.adapter';
import { HrUserProvisioningAdapter } from './application/adapters/hr-user-provisioning.adapter';
import { USER_PROVISIONING_PORT } from '../../shared/kernel/domain/ports/user-provisioning.port';

@Module({
  imports: [
    FinanceModule,
    forwardRef(() => UserModule),
    TypeOrmModule.forFeature([
      EmployeeTypeOrmEntity,
      EmployeeDocumentTypeOrmEntity,
      EmployeeHistoryTypeOrmEntity,
      AttendanceRecordTypeOrmEntity,
      PayrollRunTypeOrmEntity,
      PayrollDetailTypeOrmEntity,
      ThrRecordTypeOrmEntity,
      BpjsEnrollmentTypeOrmEntity,
      DepartmentTypeOrmEntity,
      PositionTypeOrmEntity,
    ]),
  ],
  controllers: [HrController],
  providers: [
    // Repository bindings
    { provide: EMPLOYEE_REPOSITORY, useClass: EmployeeTypeOrmRepository },
    { provide: ATTENDANCE_REPOSITORY, useClass: AttendanceTypeOrmRepository },
    { provide: PAYROLL_REPOSITORY, useClass: PayrollTypeOrmRepository },
    { provide: THR_REPOSITORY, useClass: ThrTypeOrmRepository },
    { provide: BPJS_REPOSITORY, useClass: BpjsTypeOrmRepository },
    { provide: DEPARTMENT_REPOSITORY, useClass: DepartmentTypeOrmRepository },
    { provide: POSITION_REPOSITORY, useClass: PositionTypeOrmRepository },

    // Service bindings
    { provide: EMPLOYEE_SERVICE, useClass: EmployeeService },
    { provide: ATTENDANCE_SERVICE, useClass: AttendanceService },
    { provide: PAYROLL_SERVICE, useClass: PayrollEngineService },
    { provide: PAYSLIP_SERVICE, useClass: PaySlipService },
    { provide: BPJS_SERVICE, useClass: BpjsReportService },
    { provide: THR_SERVICE, useClass: ThrService },
    { provide: DEPARTMENT_SERVICE, useClass: DepartmentService },
    { provide: POSITION_SERVICE, useClass: PositionService },
    HrFinanceAdapter,
    HrUserProvisioningAdapter,
    {
      provide: USER_PROVISIONING_PORT,
      useExisting: HrUserProvisioningAdapter,
    },
  ],
  exports: [
    EMPLOYEE_SERVICE,
    PAYROLL_SERVICE,
    DEPARTMENT_SERVICE,
    POSITION_SERVICE,
    USER_PROVISIONING_PORT,
  ],
})
export class HrModule {}
