import { Module } from '@nestjs/common';
import { ServiceRecordsService } from './service-records.service';
import { ServiceRecordsController } from './service-records.controller';
import { TechniciansModule } from '../technicians/technicians.module';

@Module({
  imports: [TechniciansModule],
  providers: [ServiceRecordsService],
  controllers: [ServiceRecordsController],
  exports: [ServiceRecordsService],
})
export class ServiceRecordsModule {}
