import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
import { MyOvertimeServicePort } from '../ports/my-overtime-service.port'
import { OVERTIME_REQUEST_REPOSITORY } from '../../domain/repositories/self-service-repository.port'
import type { OvertimeRequestRepositoryPort } from '../../domain/repositories/self-service-repository.port'

@Injectable()
export class MyOvertimeService implements MyOvertimeServicePort {
  constructor(
    @Inject(OVERTIME_REQUEST_REPOSITORY)
    private readonly overtimeRequestRepo: OvertimeRequestRepositoryPort,
  ) {}

  async getRequests(employeeId: string, filters?: { status?: string }): Promise<any[]> {
    return this.overtimeRequestRepo.findByEmployeeId(employeeId, filters)
  }

  async createRequest(
    employeeId: string,
    data: {
      date: string
      startTime: string
      endTime: string
      reason: string
      projectReference?: string
    },
  ): Promise<any> {
    const hours = this.calculateHours(data.startTime, data.endTime)
    if (hours <= 0) {
      throw new BadRequestException('End time must be after start time')
    }

    return this.overtimeRequestRepo.create({
      employeeId,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      hours,
      reason: data.reason,
      projectReference: data.projectReference || null,
      status: 'pending',
    })
  }

  async getPendingForSupervisor(supervisorId: string): Promise<any[]> {
    return this.overtimeRequestRepo.findPendingBySupervisor(supervisorId)
  }

  async approve(requestId: string, approverId: string): Promise<any> {
    const request = await this.overtimeRequestRepo.findById(requestId)
    if (!request) {
      throw new NotFoundException('Overtime request not found')
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Only pending requests can be approved')
    }

    return this.overtimeRequestRepo.update(requestId, {
      status: 'approved',
      approvedBy: approverId,
      approvedAt: new Date(),
    })
  }

  async reject(requestId: string, approverId: string, reason: string): Promise<any> {
    const request = await this.overtimeRequestRepo.findById(requestId)
    if (!request) {
      throw new NotFoundException('Overtime request not found')
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Only pending requests can be rejected')
    }

    return this.overtimeRequestRepo.update(requestId, {
      status: 'rejected',
      approvedBy: approverId,
      approvedAt: new Date(),
      rejectionReason: reason,
    })
  }

  private calculateHours(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)

    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    const diffMinutes = endMinutes - startMinutes
    if (diffMinutes <= 0) return 0

    return Math.round((diffMinutes / 60) * 100) / 100
  }
}
