import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CallStatus } from '@prisma/client';

export interface CreateCallDto {
  ringcentralCallId: string;
  callerNumber: string;
  callerName?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CallsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    technicianId?: string;
    status?: CallStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { technicianId, status, startDate, endDate, page = 1, limit = 20 } = params;

    const where: Record<string, unknown> = {};

    if (technicianId) where.technicianId = technicianId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
      if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
    }

    const [calls, total] = await Promise.all([
      this.prisma.call.findMany({
        where,
        include: {
          technician: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          serviceRecord: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.call.count({ where }),
    ]);

    return {
      data: calls,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const call = await this.prisma.call.findUnique({
      where: { id },
      include: {
        technician: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        serviceRecord: true,
      },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    return call;
  }

  async findByRingCentralId(ringcentralCallId: string) {
    return this.prisma.call.findUnique({
      where: { ringcentralCallId },
    });
  }

  async create(data: CreateCallDto) {
    return this.prisma.call.create({
      data: {
        ringcentralCallId: data.ringcentralCallId,
        callerNumber: data.callerNumber,
        callerName: data.callerName,
        status: CallStatus.PENDING,
        metadata: data.metadata || {},
      },
    });
  }

  async assignToTechnician(id: string, technicianId: string) {
    return this.prisma.call.update({
      where: { id },
      data: {
        technicianId,
        status: CallStatus.ROUTED,
        routedAt: new Date(),
      },
    });
  }

  async markAnswered(id: string) {
    return this.prisma.call.update({
      where: { id },
      data: {
        status: CallStatus.ANSWERED,
        answeredAt: new Date(),
      },
    });
  }

  async markCompleted(id: string, duration?: number, recordingUrl?: string) {
    return this.prisma.call.update({
      where: { id },
      data: {
        status: CallStatus.COMPLETED,
        endedAt: new Date(),
        duration,
        recordingUrl,
      },
    });
  }

  async markMissed(id: string) {
    return this.prisma.call.update({
      where: { id },
      data: {
        status: CallStatus.MISSED,
        endedAt: new Date(),
      },
    });
  }

  async getCallStats(startDate?: Date, endDate?: Date) {
    const where: Record<string, unknown> = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
      if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
    }

    const [total, byStatus, avgDuration] = await Promise.all([
      this.prisma.call.count({ where }),
      this.prisma.call.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.call.aggregate({
        where: {
          ...where,
          duration: { not: null },
        },
        _avg: { duration: true },
      }),
    ]);

    const statusCounts = byStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      byStatus: statusCounts,
      averageDuration: Math.round(avgDuration._avg.duration || 0),
    };
  }
}
