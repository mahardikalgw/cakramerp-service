import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common'
import { MyLeaveServicePort } from '../ports/my-leave-service.port'
import {
  LEAVE_TYPE_REPOSITORY,
  LEAVE_BALANCE_REPOSITORY,
  LEAVE_REQUEST_REPOSITORY,
} from '../../domain/repositories/self-service-repository.port'
import type {
  LeaveTypeRepositoryPort,
  LeaveBalanceRepositoryPort,
  LeaveRequestRepositoryPort,
} from '../../domain/repositories/self-service-repository.port'

@Injectable()
export class MyLeaveService implements MyLeaveServicePort {
  constructor(
    @Inject(LEAVE_TYPE_REPOSITORY)
    private readonly leaveTypeRepo: LeaveTypeRepositoryPort,
    @Inject(LEAVE_BALANCE_REPOSITORY)
    private readonly leaveBalanceRepo: LeaveBalanceRepositoryPort,
    @Inject(LEAVE_REQUEST_REPOSITORY)
    private readonly leaveRequestRepo: LeaveRequestRepositoryPort,
  ) {}

  async getLeaveBalance(employeeId: string, year: number): Promise<any[]> {
    return this.leaveBalanceRepo.findByEmployeeAndYear(employeeId, year)
  }

  async getLeaveHistory(
    employeeId: string,
    filters?: { status?: string; year?: number },
  ): Promise<any[]> {
    return this.leaveRequestRepo.findByEmployeeId(employeeId, filters)
  }

  async applyLeave(
    employeeId: string,
    data: {
      leaveTypeId: string
      startDate: string
      endDate: string
      reason: string
      attachmentPath?: string
    },
  ): Promise<any> {
    const leaveType = await this.leaveTypeRepo.findById(data.leaveTypeId)
    if (!leaveType) {
      throw new NotFoundException('Leave type not found')
    }

    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date')
    }

    const workingDays = this.calculateWorkingDays(startDate, endDate)

    const year = startDate.getFullYear()
    const balance = await this.leaveBalanceRepo.findByEmployeeTypeAndYear(
      employeeId,
      data.leaveTypeId,
      year,
    )

    if (!balance) {
      throw new BadRequestException('No leave balance found for this leave type and year')
    }

    if (balance.remainingDays < workingDays) {
      throw new BadRequestException(
        `Insufficient leave balance. Available: ${balance.remainingDays}, Requested: ${workingDays}`,
      )
    }

    const leaveRequest = await this.leaveRequestRepo.create({
      employeeId,
      leaveTypeId: data.leaveTypeId,
      leaveTypeName: leaveType.name,
      startDate,
      endDate,
      workingDays,
      reason: data.reason,
      attachmentPath: data.attachmentPath || null,
      status: 'pending',
    })

    // Deduct from balance
    await this.leaveBalanceRepo.update(balance.id, {
      usedDays: Number(balance.usedDays) + workingDays,
      remainingDays: Number(balance.remainingDays) - workingDays,
    })

    return leaveRequest
  }

  async cancelLeave(employeeId: string, leaveRequestId: string): Promise<any> {
    const leaveRequest = await this.leaveRequestRepo.findById(leaveRequestId)
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found')
    }

    if (leaveRequest.employeeId !== employeeId) {
      throw new BadRequestException('You can only cancel your own leave requests')
    }

    if (leaveRequest.status !== 'pending') {
      throw new BadRequestException('Only pending leave requests can be cancelled')
    }

    // Restore balance
    const year = new Date(leaveRequest.startDate).getFullYear()
    const balance = await this.leaveBalanceRepo.findByEmployeeTypeAndYear(
      employeeId,
      leaveRequest.leaveTypeId,
      year,
    )

    if (balance) {
      await this.leaveBalanceRepo.update(balance.id, {
        usedDays: Number(balance.usedDays) - Number(leaveRequest.workingDays),
        remainingDays: Number(balance.remainingDays) + Number(leaveRequest.workingDays),
      })
    }

    return this.leaveRequestRepo.update(leaveRequestId, { status: 'cancelled' })
  }

  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0
    const current = new Date(startDate)
    while (current <= endDate) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }
    return count
  }
}
