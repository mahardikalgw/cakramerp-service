import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { PaySlipService } from './payslip.service'
import { PAYROLL_REPOSITORY } from '../../domain/repositories/payroll-repository.port'

describe('PaySlipService', () => {
  let service: PaySlipService
  let payrollRepo: any

  beforeEach(async () => {
    payrollRepo = {
      findRunById: jest.fn(),
      findRunByMonthYear: jest.fn(),
      findDetailsByRunId: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaySlipService,
        { provide: PAYROLL_REPOSITORY, useValue: payrollRepo },
      ],
    }).compile()

    service = module.get<PaySlipService>(PaySlipService)
  })

  describe('generatePaySlips', () => {
    it('should generate pay slips and return count and path', async () => {
      const run = { id: 'run-1', month: 3, year: 2024 }
      const details = [
        { employeeId: 'emp-1', employeeName: 'John', basicSalary: 5000000, grossPay: 5000000, netPay: 4500000 },
        { employeeId: 'emp-2', employeeName: 'Jane', basicSalary: 8000000, grossPay: 8000000, netPay: 7200000 },
      ]

      payrollRepo.findRunById.mockResolvedValue(run)
      payrollRepo.findDetailsByRunId.mockResolvedValue(details)

      const result = await service.generatePaySlips('run-1')

      expect(result.generated).toBe(2)
      expect(result.path).toBe('payslips/2024-03/all-payslips.csv')
    })

    it('should throw BadRequestException when run not found', async () => {
      payrollRepo.findRunById.mockResolvedValue(null)

      await expect(service.generatePaySlips('nonexistent')).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when no details found', async () => {
      payrollRepo.findRunById.mockResolvedValue({ id: 'run-1' })
      payrollRepo.findDetailsByRunId.mockResolvedValue([])

      await expect(service.generatePaySlips('run-1')).rejects.toThrow(BadRequestException)
    })
  })

  describe('getPaySlip', () => {
    it('should return structured pay slip for an employee', async () => {
      const run = { id: 'run-1', month: 3, year: 2024 }
      const details = [
        {
          employeeId: 'emp-1',
          employeeName: 'John Doe',
          employeeNumber: 'E001',
          basicSalary: 5000000,
          siteAllowance: 500000,
          mealAllowance: 300000,
          transportAllowance: 200000,
          overtimePay: 150000,
          otherAllowances: 0,
          grossPay: 6150000,
          bpjsKesehatanEmployee: 61500,
          bpjsJht: 123000,
          bpjsJp: 61500,
          pph21: 100000,
          loanDeduction: 0,
          otherDeductions: 0,
          totalDeductions: 346000,
          bpjsKesehatanEmployer: 246000,
          bpjsJkk: 14760,
          bpjsJkm: 18450,
          netPay: 5804000,
        },
      ]

      payrollRepo.findRunById.mockResolvedValue(run)
      payrollRepo.findDetailsByRunId.mockResolvedValue(details)

      const result = await service.getPaySlip('run-1', 'emp-1')

      expect(result.employee.id).toBe('emp-1')
      expect(result.employee.name).toBe('John Doe')
      expect(result.period).toEqual({ month: 3, year: 2024 })
      expect(result.earnings.basicSalary).toBe(5000000)
      expect(result.earnings.grossPay).toBe(6150000)
      expect(result.deductions.totalDeductions).toBe(346000)
      expect(result.employerContributions.bpjsKesehatanEmployer).toBe(246000)
      expect(result.netPay).toBe(5804000)
    })

    it('should throw BadRequestException when run not found', async () => {
      payrollRepo.findRunById.mockResolvedValue(null)

      await expect(service.getPaySlip('nonexistent', 'emp-1')).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when employee detail not found', async () => {
      payrollRepo.findRunById.mockResolvedValue({ id: 'run-1' })
      payrollRepo.findDetailsByRunId.mockResolvedValue([{ employeeId: 'emp-other' }])

      await expect(service.getPaySlip('run-1', 'emp-1')).rejects.toThrow(BadRequestException)
    })
  })

  describe('downloadAll', () => {
    it('should return CSV string with all pay slips', async () => {
      const run = { id: 'run-1', month: 3, year: 2024 }
      const details = [
        {
          employeeName: 'John Doe',
          basicSalary: 5000000,
          siteAllowance: 0,
          mealAllowance: 0,
          transportAllowance: 0,
          overtimePay: 0,
          otherAllowances: 0,
          grossPay: 5000000,
          bpjsKesehatanEmployee: 50000,
          bpjsKesehatanEmployer: 200000,
          bpjsJkk: 12000,
          bpjsJkm: 15000,
          bpjsJht: 100000,
          bpjsJp: 50000,
          pph21: 50000,
          loanDeduction: 0,
          otherDeductions: 0,
          totalDeductions: 250000,
          netPay: 4750000,
        },
      ]

      payrollRepo.findRunById.mockResolvedValue(run)
      payrollRepo.findDetailsByRunId.mockResolvedValue(details)

      const result = await service.downloadAll('run-1')

      expect(result).toContain('Employee Name')
      expect(result).toContain('Basic Salary')
      expect(result).toContain('"John Doe"')
      expect(result).toContain('5000000')
      expect(result).toContain('4750000')
    })

    it('should throw BadRequestException when run not found', async () => {
      payrollRepo.findRunById.mockResolvedValue(null)

      await expect(service.downloadAll('nonexistent')).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when no details found', async () => {
      payrollRepo.findRunById.mockResolvedValue({ id: 'run-1' })
      payrollRepo.findDetailsByRunId.mockResolvedValue([])

      await expect(service.downloadAll('run-1')).rejects.toThrow(BadRequestException)
    })
  })
})
