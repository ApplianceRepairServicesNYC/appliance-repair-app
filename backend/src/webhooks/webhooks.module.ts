import { Module } from '@nestjs/common';
import { RingCentralWebhookController } from './ringcentral.controller';
import { RingCentralService } from './ringcentral.service';
import { CallsModule } from '../calls/calls.module';
import { TechniciansModule } from '../technicians/technicians.module';

@Module({
  imports: [CallsModule, TechniciansModule],
  controllers: [RingCentralWebhookController],
  providers: [RingCentralService],
  exports: [RingCentralService],
})
export class WebhooksModule {}
