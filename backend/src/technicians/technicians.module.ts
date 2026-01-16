import { Module } from '@nestjs/common';
import { TechniciansService } from './technicians.service';
import { TechniciansController } from './technicians.controller';
import { UsersModule } from '../users/users.module';
import { QuotaService } from './quota.service';

@Module({
  imports: [UsersModule],
  providers: [TechniciansService, QuotaService],
  controllers: [TechniciansController],
  exports: [TechniciansService, QuotaService],
})
export class TechniciansModule {}
