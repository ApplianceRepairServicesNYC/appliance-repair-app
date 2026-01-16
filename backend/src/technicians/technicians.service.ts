import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { UsersService } from '../users/users.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { TechnicianStatus, Role } from '@prisma/client';

@Injectable()
export class TechniciansService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private usersService: UsersService,
  ) {}

  async findAll(status?: TechnicianStatus) {
    const where = status ? { status } : {};

    return this.prisma.technician.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
          },
        },
        schedules: true,
        _count: {
          select: {
            calls: true,
            serviceRecords: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const technician = await this.prisma.technician.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
          },
        },
        schedules: true,
        _count: {
          select: {
            calls: true,
            serviceRecords: true,
          },
        },
      },
    });

    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    return technician;
  }

  async findByUserId(userId: string) {
    return this.prisma.technician.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
          },
        },
        schedules: true,
      },
    });
  }

  async create(createTechnicianDto: CreateTechnicianDto, adminId: string) {
    // Create user first
    const user = await this.usersService.create({
      email: createTechnicianDto.email,
      password: createTechnicianDto.password,
      name: createTechnicianDto.name,
      role: Role.TECHNICIAN,
      isActive: true,
    });

    // Create technician profile
    const technician = await this.prisma.technician.create({
      data: {
        userId: user.id,
        phone: createTechnicianDto.phone,
        weeklyQuota: createTechnicianDto.weeklyQuota || 25,
        status: TechnicianStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'CREATE',
      entityType: 'TECHNICIAN',
      entityId: technician.id,
      details: { email: user.email, name: user.name },
    });

    return technician;
  }

  async update(id: string, updateTechnicianDto: UpdateTechnicianDto, adminId: string) {
    const technician = await this.findById(id);

    const updated = await this.prisma.technician.update({
      where: { id },
      data: {
        phone: updateTechnicianDto.phone,
        weeklyQuota: updateTechnicianDto.weeklyQuota,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'UPDATE',
      entityType: 'TECHNICIAN',
      entityId: technician.id,
      details: updateTechnicianDto,
    });

    return updated;
  }

  async lock(id: string, reason: string, adminId: string) {
    const technician = await this.findById(id);

    if (technician.status === TechnicianStatus.LOCKED) {
      throw new BadRequestException('Technician is already locked');
    }

    const updated = await this.prisma.technician.update({
      where: { id },
      data: {
        status: TechnicianStatus.LOCKED,
        lockedAt: new Date(),
        lockedReason: reason,
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

    await this.auditService.log({
      userId: adminId,
      action: 'LOCK',
      entityType: 'TECHNICIAN',
      entityId: technician.id,
      details: { reason },
    });

    return updated;
  }

  async unlock(id: string, adminId: string) {
    const technician = await this.findById(id);

    if (technician.status !== TechnicianStatus.LOCKED) {
      throw new BadRequestException('Technician is not locked');
    }

    const updated = await this.prisma.technician.update({
      where: { id },
      data: {
        status: TechnicianStatus.ACTIVE,
        lockedAt: null,
        lockedReason: null,
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

    await this.auditService.log({
      userId: adminId,
      action: 'UNLOCK',
      entityType: 'TECHNICIAN',
      entityId: technician.id,
      details: { previousReason: technician.lockedReason },
    });

    return updated;
  }

  async getAvailableTechnicians() {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    return this.prisma.technician.findMany({
      where: {
        status: TechnicianStatus.ACTIVE,
        user: {
          isActive: true,
        },
        schedules: {
          some: {
            dayOfWeek: currentDay,
            isAvailable: true,
            startTime: { lte: currentTime },
            endTime: { gte: currentTime },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        schedules: {
          where: {
            dayOfWeek: currentDay,
          },
        },
      },
      orderBy: {
        currentWeekCompleted: 'asc', // Prioritize technicians with fewer completions
      },
    });
  }

  async incrementCompletedCount(id: string) {
    return this.prisma.technician.update({
      where: { id },
      data: {
        currentWeekCompleted: { increment: 1 },
      },
    });
  }

  async delete(id: string, adminId: string) {
    const technician = await this.findById(id);

    await this.prisma.technician.delete({ where: { id } });
    await this.usersService.delete(technician.userId);

    await this.auditService.log({
      userId: adminId,
      action: 'DELETE',
      entityType: 'TECHNICIAN',
      entityId: id,
      details: { email: technician.user.email },
    });

    return { success: true };
  }
}
