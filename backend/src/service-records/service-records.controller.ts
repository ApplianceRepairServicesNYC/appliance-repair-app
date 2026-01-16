import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ServiceStatus } from '@prisma/client';
import { ServiceRecordsService } from './service-records.service';
import { CreateServiceRecordDto } from './dto/create-service-record.dto';
import { UpdateServiceRecordDto } from './dto/update-service-record.dto';
import { CompleteServiceRecordDto } from './dto/complete-service-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('service-records')
@Controller('service-records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ServiceRecordsController {
  constructor(private serviceRecordsService: ServiceRecordsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all service records' })
  @ApiQuery({ name: 'technicianId', required: false })
  @ApiQuery({ name: 'status', enum: ServiceStatus, required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of service records' })
  findAll(
    @Query('technicianId') technicianId?: string,
    @Query('status') status?: ServiceStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.serviceRecordsService.findAll({
      technicianId,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get service record statistics' })
  @ApiQuery({ name: 'technicianId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Service record statistics' })
  getStats(
    @Query('technicianId') technicianId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.serviceRecordsService.getStats(
      technicianId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service record by ID' })
  @ApiResponse({ status: 200, description: 'Service record found' })
  @ApiResponse({ status: 404, description: 'Service record not found' })
  findOne(@Param('id') id: string) {
    return this.serviceRecordsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create service record' })
  @ApiResponse({ status: 201, description: 'Service record created' })
  create(
    @Body() createDto: CreateServiceRecordDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.serviceRecordsService.create(createDto, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update service record' })
  @ApiResponse({ status: 200, description: 'Service record updated' })
  @ApiResponse({ status: 404, description: 'Service record not found' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceRecordDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.serviceRecordsService.update(id, updateDto, userId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark service record as complete' })
  @ApiResponse({ status: 200, description: 'Service record completed' })
  @ApiResponse({ status: 400, description: 'Already completed' })
  complete(
    @Param('id') id: string,
    @Body() completeDto: CompleteServiceRecordDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.serviceRecordsService.markComplete(id, completeDto, userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel service record' })
  @ApiResponse({ status: 200, description: 'Service record cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel completed record' })
  cancel(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.serviceRecordsService.cancel(id, userId);
  }
}
