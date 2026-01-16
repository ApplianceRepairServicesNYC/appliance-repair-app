import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  async findAll(technicianId?: string) {
    const where = technicianId ? { technicianId } : {};

    return this.prisma.schedule.findMany({
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
      },
      orderBy: [{ technicianId: 'asc' }, { dayOfWeek: 'asc' }],
    });
  }

  async findById(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
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
      },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  async findByTechnicianAndDay(technicianId: string, dayOfWeek: number) {
    return this.prisma.schedule.findUnique({
      where: {
        technicianId_dayOfWeek: {
          technicianId,
          dayOfWeek,
        },
      },
    });
  }

  async create(createScheduleDto: CreateScheduleDto) {
    // Validate time format
    if (!this.isValidTimeFormat(createScheduleDto.startTime) ||
        !this.isValidTimeFormat(createScheduleDto.endTime)) {
      throw new BadRequestException('Invalid time format. Use HH:mm');
    }

    // Validate time range
    if (createScheduleDto.startTime >= createScheduleDto.endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check for existing schedule
    const existing = await this.findByTechnicianAndDay(
      createScheduleDto.technicianId,
      createScheduleDto.dayOfWeek,
    );

    if (existing) {
      throw new BadRequestException('Schedule already exists for this day');
    }

    return this.prisma.schedule.create({
      data: createScheduleDto,
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
  }

  async update(id: string, updateScheduleDto: UpdateScheduleDto) {
    await this.findById(id);

    if (updateScheduleDto.startTime && !this.isValidTimeFormat(updateScheduleDto.startTime)) {
      throw new BadRequestException('Invalid start time format');
    }

    if (updateScheduleDto.endTime && !this.isValidTimeFormat(updateScheduleDto.endTime)) {
      throw new BadRequestException('Invalid end time format');
    }

    return this.prisma.schedule.update({
      where: { id },
      data: updateScheduleDto,
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
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.schedule.delete({ where: { id } });
  }

  async bulkCreate(technicianId: string, schedules: Omit<CreateScheduleDto, 'technicianId'>[]) {
    const results = [];

    for (const schedule of schedules) {
      try {
        const created = await this.create({
          ...schedule,
          technicianId,
        });
        results.push(created);
      } catch (error) {
        // Skip if schedule already exists
        if (error instanceof BadRequestException && 
            error.message.includes('already exists')) {
          continue;
        }
        throw error;
      }
    }

    return results;
  }

  async getTechnicianWeeklySchedule(technicianId: string) {
    const schedules = await this.prisma.schedule.findMany({
      where: { technicianId },
      orderBy: { dayOfWeek: 'asc' },
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return dayNames.map((name, index) => {
      const schedule = schedules.find((s) => s.dayOfWeek === index);
      return {
        day: name,
        dayOfWeek: index,
        schedule: schedule || null,
        isAvailable: schedule?.isAvailable || false,
      };
    });
  }

  private isValidTimeFormat(time: string): boolean {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
  }
}
