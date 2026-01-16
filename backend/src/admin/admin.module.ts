import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { TechniciansModule } from '../technicians/technicians.module';
import { CallsModule } from '../calls/calls.module';
import { ServiceRecordsModule } from '../service-records/service-records.module';

@Module({
  imports: [TechniciansModule, CallsModule, ServiceRecordsModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
