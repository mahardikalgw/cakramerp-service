import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PayrollEngineService } from './payroll-engine.service'
import { PAYROLL_REPOSITORY } from '../../domain/repositories/payroll-repository.port'
import { EMPLOYEE_REPOSITORY } from '../../domain/repositories/employee-repository.port'
import { ATTENDANCE_REPOSITORY } from '../../domain/repositories/attendance-repository.port'

describe('PayrollEngineService', () => {
  let service: PayrollEngineService
  let payrollRepo: any
  let employeeRepo: any
  let attendanceRepo: any
  let dataSource: any

  beforeEach(async () => {
    payrollRepo = {
      findRunByMonthYear: jest.fn(),
      findRunById: jest.fn(),
      findAllRuns: jest.fn(),
      createRun: jest.fn(),
      updateRun: jest.fn(),
      deleteRun: jest.fn(),
      createDetail: jest.fn(),
      findDetailsByRunId: jest.fn(),
      deleteDetailsByRunId: jest.fn(),
    }
    employeeRepo = {
      findActiveEmployees: jest.fn(),
    }
    attendanceRepo = {
      getOvertimeHours: jest.fn(),
    }
    const mockQueueRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(),
    }
    dataSource = {
      getRepository: jest.fn().mockReturnValue(mockQueueRepo),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollEngineService,
        { provide: PAYROLL_REPOSITORY, useValue: payrollRepo },
        { provide: EMPLOYEE_REPOSITORY, useValue: employeeRepo },
        { provide: ATTENDANCE_REPOSITORY, useValue: attendanceRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile()

    service = module.get<PayrollEngineService>(PayrollEngineService)
  })

  describe('getPayrollRuns', () => {
    it('should return paginated payroll runs', async () => {
      const expected = { data: [{ id: 'run-1', month: 3, year: 2024 }], total: 1 }
      payrollRepo.findAllRuns.mockResolvedValue(expected)

      const result = await service.getPayrollRuns({ year: 2024, status: 'draft' })

      expect(result).toEqual(expected)
      expect(payrollRepo.findAllRuns).toHaveBeenCalledWith({ year: 2024, status: 'draft' })
    })

    it('should work without filters', async () => {
      payrollRepo.findAllRuns.mockResolvedValue({ data: [], total: 0 })

      const result = await service.getPayrollRuns()

      expect(result).toEqual({ data: [], total: 0 })
    })
  })

  describe('getPayrollRun', () => {
    it('should return run with details', async () => {
      const run = { id: 'run-1', month: 3, year: 2024 }
      const details = [{ id: 'd1', employeeId: 'emp-1' }]

      payrollRepo.findRunById.mockResolvedValue(run)
      payrollRepo.findDetailsByRunId.mockResolvedValue(details)

      const result = await service.getPayrollRun('run-1')

      expect(result).toEqual({ run, details })
    })

    it('should throw BadRequestException when run not found', async () => {
      payrollRepo.findRunById.mockResolvedValue(null)

      await expect(service.getPayrollRun('nonexistent')).rejects.toThrow(BadRequestException)
    })
  })

  describe('runPayroll', () => {
    it('should create payroll run and calculate for all active employees', async () => {
      const employees = [
        { id: 'emp-1', fullName: 'John', basicSalary: 5000000 },
        { id: 'emp-2', fullName: 'Jane', basicSalary: 8000000 },
      ]
      const payrollRun = { id: 'run-1', month: 3, year: 2024, status: 'draft' }

      payrollRepo.findRunByMonthYear.mockResolvedValue(null)
      employeeRepo.findActiveEmployees.mockResolvedValue(employees)
      payrollRepo.createRun.mockResolvedValue(payrollRun)
      attendanceRepo.getOvertimeHours.mockResolvedValue(0)
      payrollRepo.createDetail.mockResolvedValue({})
      payrollRepo.updateRun.mockResolvedValue({ ...payrollRun, totalGross: 13000000 })

      const result = await service.runPayroll(3, 2024)

      expect(payrollRepo.createRun).toHaveBeenCalledWith(expect.objectContaining({
        month: 3,
        year: 2024,
        status: 'draft',
        totalEmployees: 2,
      }))
      expect(payrollRepo.createDetail).toHaveBeenCalledTimes(2)
      expect(payrollRepo.updateRun).toHaveBeenCalledWith('run-1', expect.objectContaining({
        totalGross: expect.any(Number),
        totalNet: expect.any(Number),
      }))
    })

    it('should throw BadRequestException if period already confirmed', async () => {
      payrollRepo.findRunByMonthYear.mockResolvedValue({ id: 'run-1', status: 'confirmed' })

      await expect(service.runPayroll(3, 2024)).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException if period already posted', async () => {
      payrollRepo.findRunByMonthYear.mockResolvedValue({ id: 'run-1', status: 'posted' })

      await expect(service.runPayroll(3, 2024)).rejects.toThrow(BadRequestException)
    })

    it('should delete existing draft and re-run', async () => {
      const existingDraft = { id: 'run-old', status: 'draft' }
      const employees = [{ id: 'emp-1', fullName: 'John', basicSalary: 5000000 }]

      payrollRepo.findRunByMonthYear.mockResolvedValue(existingDraft)
      payrollRepo.deleteDetailsByRunId.mockResolvedValue(undefined)
      payrollRepo.deleteRun.mockResolvedValue(undefined)
      employeeRepo.findActiveEmployees.mockResolvedValue(employees)
      payrollRepo.createRun.mockResolvedValue({ id: 'run-new', month: 3, year: 2024 })
      attendanceRepo.getOvertimeHours.mockResolvedValue(0)
      payrollRepo.createDetail.mockResolvedValue({})
      payrollRepo.updateRun.mockResolvedValue({})

      await service.runPayroll(3, 2024)

      expect(payrollRepo.deleteDetailsByRunId).toHaveBeenCalledWith('run-old')
      expect(payrollRepo.deleteRun).toHaveBeenCalledWith('run-old')
    })

    it('should include overtime pay in gross calculation', async () => {
      const employees = [{ id: 'emp-1', fullName: 'John', basicSalary: 17300000 }]

      payrollRepo.findRunByMonthYear.mockResolvedValue(null)
      employeeRepo.findActiveEmployees.mockResolvedValue(employees)
      payrollRepo.createRun.mockResolvedValue({ id: 'run-1', month: 3, year: 2024 })
      attendanceRepo.getOvertimeHours.mockResolvedValue(10)
      payrollRepo.createDetail.mockResolvedValue({})
      payrollRepo.updateRun.mockResolvedValue({})

      await service.runPayroll(3, 2024)

      expect(payrollRepo.createDetail).toHaveBeenCalledWith(expect.objectContaining({
        basicSalary: 17300000,
        overtimePay: expect.any(Number),
        grossPay: expect.any(Number),
      }))
    })
  })

  describe('confirmPayroll', () => {
    it('should confirm a draft payroll run', async () => {
      const run = { id: 'run-1', status: 'draft' }
      const confirmed = { id: 'run-1', status: 'confirmed' }

      payrollRepo.findRunById.mockResolvedValue(run)
      payrollRepo.updateRun.mockResolvedValue(confirmed)

      const result = await service.confirmPayroll('run-1', 'user-1')

      expect(result).toEqual(confirmed)
      expect(payrollRepo.updateRun).toHaveBeenCalledWith('run-1', expect.objectContaining({
        status: 'confirmed',
        confirmedBy: 'user-1',
      }))
    })

    it('should throw BadRequestException when run not found', async () => {
      payrollRepo.findRunById.mockResolvedValue(null)

      await expect(service.confirmPayroll('nonexistent', 'user-1')).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when run is not draft', async () => {
      payrollRepo.findRunById.mockResolvedValue({ id: 'run-1', status: 'confirmed' })

      await expect(service.confirmPayroll('run-1', 'user-1')).rejects.toThrow(BadRequestException)
    })
  })

  describe('postToGL', () => {
    it('should post confirmed payroll to GL Posting Queue', async () => {
      const run = { id: 'run-1', month: 3, year: 2024, status: 'confirmed' }
      const details = [
        {
          employeeId: 'emp-1',
          grossPay: 5000000,
          bpjsKesehatanEmployee: 50000,
          bpjsKesehatanEmployer: 200000,
          bpjsJkk: 12000,
          bpjsJkm: 15000,
          bpjsJht: 100000,
          bpjsJp: 50000,
          pph21: 100000,
          netPay: 4700000,
        },
      ]

      payrollRepo.findRunById.mockResolvedValue(run)
      payrollRepo.findDetailsByRunId.mockResolvedValue(details)
      payrollRepo.updateRun.mockResolvedValue({ ...run, status: 'posted' })

      const result = await service.postToGL('run-1', 'user-1')

      expect(payrollRepo.updateRun).toHaveBeenCalledWith('run-1', expect.objectContaining({
        status: 'posted',
        postedBy: 'user-1',
      }))
    })

    it('should throw BadRequestException when run not found', async () => {
      payrollRepo.findRunById.mockResolvedValue(null)

      await expect(service.postToGL('nonexistent', 'user-1')).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when run is not confirmed', async () => {
      payrollRepo.findRunById.mockResolvedValue({ id: 'run-1', status: 'draft' })

      await expect(service.postToGL('run-1', 'user-1')).rejects.toThrow(BadRequestException)
    })
  })
})
