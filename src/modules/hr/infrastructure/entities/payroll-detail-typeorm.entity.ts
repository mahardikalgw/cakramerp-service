import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('payroll_details')
export class PayrollDetailTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  payrollRunId: string;

  @Column({ type: 'uuid' })
  employeeId: string;

  @Column({ type: 'varchar', length: 255 })
  employeeName: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  basicSalary: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  siteAllowance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  mealAllowance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  transportAllowance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  overtimePay: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  otherAllowances: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  grossPay: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  bpjsKesehatanEmployee: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  bpjsKesehatanEmployer: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  bpjsJkk: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  bpjsJkm: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  bpjsJht: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  bpjsJp: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  pph21: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  loanDeduction: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  otherDeductions: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalDeductions: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  netPay: number;
}
