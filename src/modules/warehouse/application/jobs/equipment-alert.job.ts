import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, Repository, LessThanOrEqual } from 'typeorm';
import { MaintenanceScheduleTypeOrmEntity } from '../../infrastructure/entities/maintenance-schedule-typeorm.entity';
import { EquipmentUnitTypeOrmEntity } from '../../infrastructure/entities/equipment-unit-typeorm.entity';

@Injectable()
export class EquipmentMaintenanceAlertJob {
  private readonly logger = new Logger(EquipmentMaintenanceAlertJob.name);
  private readonly scheduleRepo: Repository<MaintenanceScheduleTypeOrmEntity>;
  private readonly equipmentRepo: Repository<EquipmentUnitTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.scheduleRepo = dataSource.getRepository(
      MaintenanceScheduleTypeOrmEntity,
    );
    this.equipmentRepo = dataSource.getRepository(EquipmentUnitTypeOrmEntity);
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleMaintenanceAlerts(): Promise<void> {
    this.logger.log('Running equipment maintenance alert check...');

    const today = new Date();
    const sevenDaysFromNow = new Date(
      today.getTime() + 7 * 24 * 60 * 60 * 1000,
    );

    const schedules = await this.scheduleRepo
      .createQueryBuilder('ms')
      .innerJoin(EquipmentUnitTypeOrmEntity, 'eq', 'eq.id = ms.equipmentId')
      .where('ms.nextDueDate <= :dueDate', { dueDate: sevenDaysFromNow })
      .andWhere('eq.status = :status', { status: 'active' })
      .getMany();

    if (schedules.length === 0) {
      this.logger.log('No upcoming maintenance alerts found.');
      return;
    }

    for (const schedule of schedules) {
      const equipment = await this.equipmentRepo.findOne({
        where: { id: schedule.equipmentId },
      });
      if (!equipment) continue;

      const dueDate = new Date(schedule.nextDueDate);
      const isOverdue = dueDate < today;

      if (isOverdue) {
        this.logger.warn(
          `[OVERDUE] Equipment "${equipment.unitId}" (${equipment.brand} ${equipment.model}) - ` +
            `Maintenance "${schedule.description}" was due on ${dueDate.toISOString().split('T')[0]}`,
        );
      } else {
        this.logger.warn(
          `[DUE SOON] Equipment "${equipment.unitId}" (${equipment.brand} ${equipment.model}) - ` +
            `Maintenance "${schedule.description}" is due on ${dueDate.toISOString().split('T')[0]}`,
        );
      }
    }

    this.logger.log(
      `Maintenance alert check complete. ${schedules.length} alert(s) found.`,
    );
  }
}
