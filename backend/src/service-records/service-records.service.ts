import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { TechniciansService } from '../technicians/technicians.service';
import { CreateServiceRecordDto } from './dto/create-service-record.dto';
import { UpdateServiceRecordDto } from './dto/update-service-record.dto';
import { ServiceStatus } from '@prisma/client';

@Injectable()
export class ServiceRecordsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private techniciansService: TechniciansService,
  ) {}

  async findAll(params: {
    technicianId?: string;
    status?: ServiceStatus;
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

    const [records, total] = await Promise.all([
      this.prisma.serviceRecord.findMany({
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
          call: {
            select: {
              id: true,
              callerNumber: true,
              callerName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.serviceRecord.count({ where }),
    ]);

    return {
      data: records,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const record = await this.prisma.serviceRecord.findUnique({
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
        call: true,
      },
    });

    if (!record) {
      throw new NotFoundException('Service record not found');
    }

    return record;
  }

  async create(createDto: CreateServiceRecordDto, userId: string) {
    // Verify technician exists
    await this.techniciansService.findById(createDto.technicianId);

    const record = await this.prisma.serviceRecord.create({
      data: {
        technicianId: createDto.technicianId,
        callId: createDto.callId,
        customerName: createDto.customerName,
        customerPhone: createDto.customerPhone,
        customerAddress: createDto.customerAddress,
        applianceType: createDto.applianceType,
        issueDescription: createDto.issueDescription,
        scheduledDate: createDto.scheduledDate ? new Date(createDto.scheduledDate) : null,
        notes: createDto.notes,
        status: ServiceStatus.SCHEDULED,
      },
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
      },
    });

    await this.auditService.log({
      userId,
      action: 'CREATE',
      entityType: 'SERVICE_RECORD',
      entityId: record.id,
      details: { customerName: record.customerName },
    });

    return record;
  }

  async update(id: string, updateDto: UpdateServiceRecordDto, userId: string) {
    const record = await this.findById(id);

    const updated = await this.prisma.serviceRecord.update({
      where: { id },
      data: {
        ...updateDto,
        scheduledDate: updateDto.scheduledDate ? new Date(updateDto.scheduledDate) : record.scheduledDate,
      },
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
      },
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      entityType: 'SERVICE_RECORD',
      entityId: id,
      details: updateDto,
    });

    return updated;
  }

  async markComplete(id: string, completeDto: {
    diagnosis?: string;
    resolution?: string;
    partsUsed?: string;
    laborHours?: number;
    notes?: string;
  }, userId: string) {
    const record = await this.findById(id);

    if (record.status === ServiceStatus.COMPLETED) {
      throw new BadRequestException('Service record is already completed');
    }

    const updated = await this.prisma.serviceRecord.update({
      where: { id },
      data: {
        ...completeDto,
        status: ServiceStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        technician: true,
      },
    });

    // Increment technician's completed count
    await this.techniciansService.incrementCompletedCount(record.technicianId);

    await this.auditService.log({
      userId,
      action: 'SERVICE_COMPLETED',
      entityType: 'SERVICE_RECORD',
      entityId: id,
      details: { technicianId: record.technicianId },
    });

    return updated;
  }

  async cancel(id: string, userId: string) {
    const record = await this.findById(id);

    if (record.status === ServiceStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed service record');
    }

    const updated = await this.prisma.serviceRecord.update({
      where: { id },
      data: {
        status: ServiceStatus.CANCELLED,
      },
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      entityType: 'SERVICE_RECORD',
      entityId: id,
      details: { status: 'CANCELLED' },
    });

    return updated;
  }

  async getStats(technicianId?: string, startDate?: Date, endDate?: Date) {
    const where: Record<string, unknown> = {};

    if (technicianId) where.technicianId = technicianId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
      if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
    }

    const [total, byStatus, avgLaborHours] = await Promise.all([
      this.prisma.serviceRecord.count({ where }),
      this.prisma.serviceRecord.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.serviceRecord.aggregate({
        where: {
          ...where,
          laborHours: { not: null },
        },
        _avg: { laborHours: true },
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
      averageLaborHours: avgLaborHours._avg.laborHours || 0,
    };
  }
}
