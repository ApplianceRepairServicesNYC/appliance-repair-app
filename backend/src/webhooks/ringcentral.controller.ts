import {
  Controller,
  Post,
  Body,
  Headers,
  Res,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Response } from 'express';
import { RingCentralService, RingCentralWebhookPayload } from './ringcentral.service';

@ApiTags('webhooks')
@Controller('webhooks/ringcentral')
export class RingCentralWebhookController {
  private readonly logger = new Logger(RingCentralWebhookController.name);

  constructor(private ringCentralService: RingCentralService) {}

  @Post('incoming-call')
  @ApiOperation({ summary: 'Handle RingCentral incoming call webhook' })
  @ApiHeader({ name: 'Validation-Token', required: false })
  @ApiHeader({ name: 'X-Ringcentral-Signature', required: false })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  async handleIncomingCall(
    @Body() payload: RingCentralWebhookPayload,
    @Headers('Validation-Token') validationToken: string | undefined,
    @Headers('X-Ringcentral-Signature') signature: string | undefined,
    @Res() res: Response,
  ) {
    // Handle webhook validation request
    if (validationToken) {
      this.logger.log('Received webhook validation request');
      res.setHeader('Validation-Token', validationToken);
      return res.status(HttpStatus.OK).send(validationToken);
    }

    // Validate signature in production
    if (process.env.NODE_ENV === 'production') {
      const bodyString = JSON.stringify(payload);
      const isValid = this.ringCentralService.validateWebhookSignature(
        signature,
        bodyString,
      );

      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    try {
      // Determine event type and process accordingly
      const eventType = payload.event;

      this.logger.log(`Received RingCentral event: ${eventType}`);

      if (eventType?.includes('telephony/sessions')) {
        // Check if this is an incoming call or status update
        const party = payload.body.parties?.[0];
        const direction = party?.direction;
        const statusCode = party?.status?.code;

        if (direction === 'Inbound' && statusCode === 'Proceeding') {
          // New incoming call
          const result = await this.ringCentralService.handleIncomingCall(payload);
          return res.status(HttpStatus.OK).json(result);
        } else {
          // Call status update
          await this.ringCentralService.handleCallStatusUpdate(payload);
          return res.status(HttpStatus.OK).json({ success: true });
        }
      }

      // Unknown event type, acknowledge receipt
      return res.status(HttpStatus.OK).json({ received: true });
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      throw error;
    }
  }
}
