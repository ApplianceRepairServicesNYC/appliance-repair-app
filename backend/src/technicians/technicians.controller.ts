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
import { Role, TechnicianStatus } from '@prisma/client';
import { TechniciansService } from './technicians.service';
import { QuotaService } from './quota.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { LockTechnicianDto } from './dto/lock-technician.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('technicians')
@Controller('technicians')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TechniciansController {
  constructor(
    private techniciansService: TechniciansService,
    private quotaService: QuotaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all technicians' })
  @ApiQuery({ name: 'status', enum: TechnicianStatus, required: false })
  @ApiResponse({ status: 200, description: 'List of technicians' })
  findAll(@Query('status') status?: TechnicianStatus) {
    return this.techniciansService.findAll(status);
  }

  @Get('available')
  @ApiOperation({ summary: 'Get currently available technicians' })
  @ApiResponse({ status: 200, description: 'List of available technicians' })
  getAvailable() {
    return this.techniciansService.getAvailableTechnicians();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get technician by ID' })
  @ApiResponse({ status: 200, description: 'Technician found' })
  @ApiResponse({ status: 404, description: 'Technician not found' })
  findOne(@Param('id') id: string) {
    return this.techniciansService.findById(id);
  }

  @Get(':id/quota')
  @ApiOperation({ summary: 'Get technician quota status' })
  @ApiResponse({ status: 200, description: 'Quota status' })
  getQuotaStatus(@Param('id') id: string) {
    return this.quotaService.getTechnicianQuotaStatus(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new technician' })
  @ApiResponse({ status: 201, description: 'Technician created' })
  create(
    @Body() createTechnicianDto: CreateTechnicianDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.techniciansService.create(createTechnicianDto, adminId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update technician' })
  @ApiResponse({ status: 200, description: 'Technician updated' })
  @ApiResponse({ status: 404, description: 'Technician not found' })
  update(
    @Param('id') id: string,
    @Body() updateTechnicianDto: UpdateTechnicianDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.techniciansService.update(id, updateTechnicianDto, adminId);
  }

  @Patch(':id/lock')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lock technician' })
  @ApiResponse({ status: 200, description: 'Technician locked' })
  @ApiResponse({ status: 400, description: 'Technician already locked' })
  lock(
    @Param('id') id: string,
    @Body() lockDto: LockTechnicianDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.techniciansService.lock(id, lockDto.reason, adminId);
  }

  @Patch(':id/unlock')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Unlock technician' })
  @ApiResponse({ status: 200, description: 'Technician unlocked' })
  @ApiResponse({ status: 400, description: 'Technician not locked' })
  unlock(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.techniciansService.unlock(id, adminId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete technician' })
  @ApiResponse({ status: 200, description: 'Technician deleted' })
  @ApiResponse({ status: 404, description: 'Technician not found' })
  remove(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.techniciansService.delete(id, adminId);
  }
}
