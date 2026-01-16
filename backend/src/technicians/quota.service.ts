import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { TechnicianStatus } from '@prisma/client';

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private configService: ConfigService,
  ) {}

  // Run every day at midnight to check quotas
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkQuotaResets() {
    const resetDay = parseInt(this.configService.get<string>('QUOTA_RESET_DAY', '1'), 10);
    const resetHour = parseInt(this.configService.get<string>('QUOTA_RESET_HOUR', '0'), 10);

    const now = new Date();
    
    if (now.getDay() === resetDay && now.getHours() === resetHour) {
      await this.performWeeklyQuotaReset();
    }
  }

  async performWeeklyQuotaReset() {
    this.logger.log('Performing weekly quota reset...');

    // Get all active technicians
    const technicians = await this.prisma.technician.findMany({
      where: {
        status: { not: TechnicianStatus.INACTIVE },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    for (const technician of technicians) {
      // Check if technician met quota
      const metQuota = technician.currentWeekCompleted >= technician.weeklyQuota;

      if (!metQuota && technician.status === TechnicianStatus.ACTIVE) {
        // Lock technician for not meeting quota
        await this.prisma.technician.update({
          where: { id: technician.id },
          data: {
            status: TechnicianStatus.LOCKED,
            lockedAt: new Date(),
            lockedReason: `Failed to meet weekly quota (${technician.currentWeekCompleted}/${technician.weeklyQuota})`,
            currentWeekCompleted: 0,
            lastQuotaReset: new Date(),
          },
        });

        await this.auditService.log({
          action: 'LOCK',
          entityType: 'TECHNICIAN',
          entityId: technician.id,
          details: {
            reason: 'Quota not met',
            completed: technician.currentWeekCompleted,
            required: technician.weeklyQuota,
          },
        });

        this.logger.warn(
          `Technician ${technician.user.email} locked for not meeting quota`,
        );
      } else {
        // Reset counter for the new week
        await this.prisma.technician.update({
          where: { id: technician.id },
          data: {
            currentWeekCompleted: 0,
            lastQuotaReset: new Date(),
          },
        });
      }
    }

    await this.auditService.log({
      action: 'QUOTA_RESET',
      entityType: 'SYSTEM',
      details: {
        technicianCount: technicians.length,
        timestamp: new Date().toISOString(),
      },
    });

    this.logger.log('Weekly quota reset completed');
  }

  async manualQuotaReset(adminId: string) {
    await this.performWeeklyQuotaReset();

    await this.auditService.log({
      userId: adminId,
      action: 'QUOTA_RESET',
      entityType: 'SYSTEM',
      details: { manual: true },
    });

    return { success: true, message: 'Quota reset completed' };
  }

  async getTechnicianQuotaStatus(technicianId: string) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
    });

    if (!technician) {
      return null;
    }

    return {
      current: technician.currentWeekCompleted,
      required: technician.weeklyQuota,
      remaining: Math.max(0, technician.weeklyQuota - technician.currentWeekCompleted),
      percentage: Math.round((technician.currentWeekCompleted / technician.weeklyQuota) * 100),
      lastReset: technician.lastQuotaReset,
      onTrack: technician.currentWeekCompleted >= this.getExpectedProgress(technician.weeklyQuota),
    };
  }

  private getExpectedProgress(weeklyQuota: number): number {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    const dailyTarget = weeklyQuota / 5; // Assuming 5 work days
    return Math.floor(dailyTarget * Math.min(adjustedDay, 5));
  }
}
