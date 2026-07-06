import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('payroll_details')
export class PayrollDetailTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'uuid' })
  declare payrollRunId: string;

  @Column({ type: 'uuid' })
  declare employeeId: string;

  @Column({ type: 'varchar', length: 255 })
  declare employeeName: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare basicSalary: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare siteAllowance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare mealAllowance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare transportAllowance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare overtimePay: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare otherAllowances: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare grossPay: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare bpjsKesehatanEmployee: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare bpjsKesehatanEmployer: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare bpjsJkk: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare bpjsJkm: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare bpjsJht: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare bpjsJp: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare pph21: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare loanDeduction: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare otherDeductions: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare totalDeductions: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare netPay: number;
}
