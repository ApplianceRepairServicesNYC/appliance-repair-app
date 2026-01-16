import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('schedules')
@Controller('schedules')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SchedulesController {
  constructor(private schedulesService: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all schedules' })
  @ApiQuery({ name: 'technicianId', required: false })
  @ApiResponse({ status: 200, description: 'List of schedules' })
  findAll(@Query('technicianId') technicianId?: string) {
    return this.schedulesService.findAll(technicianId);
  }

  @Get('technician/:technicianId/weekly')
  @ApiOperation({ summary: 'Get technician weekly schedule' })
  @ApiResponse({ status: 200, description: 'Weekly schedule' })
  getWeeklySchedule(@Param('technicianId') technicianId: string) {
    return this.schedulesService.getTechnicianWeeklySchedule(technicianId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schedule by ID' })
  @ApiResponse({ status: 200, description: 'Schedule found' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  findOne(@Param('id') id: string) {
    return this.schedulesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created' })
  @ApiResponse({ status: 400, description: 'Invalid data or schedule exists' })
  create(@Body() createScheduleDto: CreateScheduleDto) {
    return this.schedulesService.create(createScheduleDto);
  }

  @Post('bulk/:technicianId')
  @ApiOperation({ summary: 'Bulk create schedules for technician' })
  @ApiResponse({ status: 201, description: 'Schedules created' })
  bulkCreate(
    @Param('technicianId') technicianId: string,
    @Body() schedules: Omit<CreateScheduleDto, 'technicianId'>[],
  ) {
    return this.schedulesService.bulkCreate(technicianId, schedules);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update schedule' })
  @ApiResponse({ status: 200, description: 'Schedule updated' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  update(@Param('id') id: string, @Body() updateScheduleDto: UpdateScheduleDto) {
    return this.schedulesService.update(id, updateScheduleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete schedule' })
  @ApiResponse({ status: 200, description: 'Schedule deleted' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  remove(@Param('id') id: string) {
    return this.schedulesService.delete(id);
  }
}
