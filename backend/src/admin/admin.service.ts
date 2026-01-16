import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { TechniciansService } from '../technicians/technicians.service';
import { QuotaService } from '../technicians/quota.service';
import { CallsService } from '../calls/calls.service';
import { ServiceRecordsService } from '../service-records/service-records.service';
import { TechnicianStatus, ServiceStatus, CallStatus, AuditAction } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private techniciansService: TechniciansService,
    private quotaService: QuotaService,
    private callsService: CallsService,
    private serviceRecordsService: ServiceRecordsService,
  ) {}

  async getDashboardStats() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    // Technician stats
    const [
      totalTechnicians,
      activeTechnicians,
      lockedTechnicians,
      availableNow,
    ] = await Promise.all([
      this.prisma.technician.count(),
      this.prisma.technician.count({ where: { status: TechnicianStatus.ACTIVE } }),
      this.prisma.technician.count({ where: { status: TechnicianStatus.LOCKED } }),
      this.techniciansService.getAvailableTechnicians().then((t) => t.length),
    ]);

    // Call stats
    const [
      callsToday,
      callsThisWeek,
      callsThisMonth,
      callsByStatus,
    ] = await Promise.all([
      this.prisma.call.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.call.count({ where: { createdAt: { gte: startOfWeek } } }),
      this.prisma.call.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.call.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    // Service record stats
    const [
      servicesThisWeek,
      servicesThisMonth,
      completedThisWeek,
      servicesByStatus,
    ] = await Promise.all([
      this.prisma.serviceRecord.count({ where: { createdAt: { gte: startOfWeek } } }),
      this.prisma.serviceRecord.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.serviceRecord.count({
        where: {
          status: ServiceStatus.COMPLETED,
          completedAt: { gte: startOfWeek },
        },
      }),
      this.prisma.serviceRecord.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    // Top performing technicians this week
    const topTechnicians = await this.prisma.technician.findMany({
      where: { status: TechnicianStatus.ACTIVE },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { currentWeekCompleted: 'desc' },
      take: 5,
    });

    // Recent activity
    const recentActivity = await this.prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      technicians: {
        total: totalTechnicians,
        active: activeTechnicians,
        locked: lockedTechnicians,
        availableNow,
      },
      calls: {
        today: callsToday,
        thisWeek: callsThisWeek,
        thisMonth: callsThisMonth,
        byStatus: callsByStatus.reduce(
          (acc, item) => {
            acc[item.status] = item._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
      services: {
        thisWeek: servicesThisWeek,
        thisMonth: servicesThisMonth,
        completedThisWeek,
        byStatus: servicesByStatus.reduce(
          (acc, item) => {
            acc[item.status] = item._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
      topTechnicians: topTechnicians.map((t) => ({
        id: t.id,
        name: t.user.name,
        email: t.user.email,
        completedThisWeek: t.currentWeekCompleted,
        quota: t.weeklyQuota,
        progress: Math.round((t.currentWeekCompleted / t.weeklyQuota) * 100),
      })),
      recentActivity,
    };
  }

  async getAuditLogs(params: {
    userId?: string;
    action?: AuditAction;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    return this.auditService.getAuditLogs(params);
  }

  async triggerQuotaReset(adminId: string) {
    return this.quotaService.manualQuotaReset(adminId);
  }

  async getSystemConfig() {
    return this.prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async updateSystemConfig(key: string, value: string, adminId: string) {
    const config = await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'UPDATE',
      entityType: 'SYSTEM_CONFIG',
      entityId: config.id,
      details: { key, value },
    });

    return config;
  }

  async getTechnicianPerformanceReport(startDate: Date, endDate: Date) {
    const technicians = await this.prisma.technician.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        serviceRecords: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        calls: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });

    return technicians.map((tech) => {
      const completedServices = tech.serviceRecords.filter(
        (r) => r.status === ServiceStatus.COMPLETED,
      );
      const totalCalls = tech.calls.length;
      const answeredCalls = tech.calls.filter(
        (c) => c.status === CallStatus.ANSWERED || c.status === CallStatus.COMPLETED,
      ).length;

      const totalLaborHours = completedServices.reduce(
        (sum, r) => sum + (r.laborHours || 0),
        0,
      );

      return {
        id: tech.id,
        name: tech.user.name,
        email: tech.user.email,
        status: tech.status,
        metrics: {
          totalServices: tech.serviceRecords.length,
          completedServices: completedServices.length,
          totalCalls,
          answeredCalls,
          callAnswerRate: totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0,
          totalLaborHours: Math.round(totalLaborHours * 100) / 100,
          averageLaborHours:
            completedServices.length > 0
              ? Math.round((totalLaborHours / completedServices.length) * 100) / 100
              : 0,
        },
      };
    });
  }
}
