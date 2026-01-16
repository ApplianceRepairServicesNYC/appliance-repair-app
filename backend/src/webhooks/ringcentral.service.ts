import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { CallsService } from '../calls/calls.service';
import { TechniciansService } from '../technicians/technicians.service';
import { AuditService } from '../common/audit/audit.service';

export interface RingCentralWebhookPayload {
  uuid: string;
  event: string;
  timestamp: string;
  subscriptionId: string;
  ownerId: string;
  body: {
    telephonySessionId?: string;
    sessionId?: string;
    serverId?: string;
    eventTime?: string;
    parties?: Array<{
      accountId?: string;
      extensionId?: string;
      id?: string;
      direction?: string;
      to?: {
        phoneNumber?: string;
        name?: string;
        extensionId?: string;
      };
      from?: {
        phoneNumber?: string;
        name?: string;
        extensionId?: string;
      };
      status?: {
        code?: string;
        reason?: string;
        callerIdStatus?: string;
      };
      recordings?: Array<{
        id?: string;
        active?: boolean;
      }>;
    }>;
    origin?: {
      type?: string;
    };
  };
}

export interface CallRoutingResult {
  success: boolean;
  callId?: string;
  technicianId?: string;
  technicianName?: string;
  message: string;
}

@Injectable()
export class RingCentralService {
  private readonly logger = new Logger(RingCentralService.name);

  constructor(
    private configService: ConfigService,
    private callsService: CallsService,
    private techniciansService: TechniciansService,
    private auditService: AuditService,
  ) {}

  validateWebhookSignature(
    signature: string | undefined,
    body: string,
  ): boolean {
    const verificationToken = this.configService.get<string>(
      'RINGCENTRAL_WEBHOOK_VERIFICATION_TOKEN',
    );

    if (!verificationToken) {
      this.logger.warn('Webhook verification token not configured');
      return false;
    }

    if (!signature) {
      this.logger.warn('No signature provided in webhook request');
      return false;
    }

    // RingCentral uses HMAC-SHA256 for webhook signatures
    const expectedSignature = crypto
      .createHmac('sha256', verificationToken)
      .update(body)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );

    if (!isValid) {
      this.logger.warn('Invalid webhook signature');
    }

    return isValid;
  }

  async handleIncomingCall(payload: RingCentralWebhookPayload): Promise<CallRoutingResult> {
    this.logger.log(`Processing incoming call: ${payload.uuid}`);

    // Extract call information
    const party = payload.body.parties?.[0];
    if (!party) {
      throw new BadRequestException('No party information in webhook payload');
    }

    const callerNumber = party.from?.phoneNumber || 'Unknown';
    const callerName = party.from?.name;
    const ringcentralCallId = payload.body.telephonySessionId || payload.uuid;

    // Check if call already exists
    const existingCall = await this.callsService.findByRingCentralId(ringcentralCallId);
    if (existingCall) {
      this.logger.log(`Call ${ringcentralCallId} already exists, skipping`);
      return {
        success: false,
        message: 'Call already processed',
      };
    }

    // Create call record
    const call = await this.callsService.create({
      ringcentralCallId,
      callerNumber,
      callerName,
      metadata: payload.body as unknown as Record<string, unknown>,
    });

    // Get available technicians (only active, unlocked, and currently scheduled)
    const availableTechnicians = await this.techniciansService.getAvailableTechnicians();

    if (availableTechnicians.length === 0) {
      this.logger.warn('No available technicians for call routing');
      return {
        success: false,
        callId: call.id,
        message: 'No available technicians',
      };
    }

    // Select technician (prioritize those with fewer completed calls this week)
    const selectedTechnician = availableTechnicians[0];

    // Assign call to technician
    await this.callsService.assignToTechnician(call.id, selectedTechnician.id);

    // Log the routing action
    await this.auditService.log({
      action: 'CALL_ROUTED',
      entityType: 'CALL',
      entityId: call.id,
      details: {
        technicianId: selectedTechnician.id,
        technicianName: selectedTechnician.user.name,
        callerNumber,
      },
    });

    this.logger.log(
      `Call ${call.id} routed to technician ${selectedTechnician.user.name}`,
    );

    return {
      success: true,
      callId: call.id,
      technicianId: selectedTechnician.id,
      technicianName: selectedTechnician.user.name,
      message: 'Call routed successfully',
    };
  }

  async handleCallStatusUpdate(payload: RingCentralWebhookPayload): Promise<void> {
    const ringcentralCallId = payload.body.telephonySessionId || payload.uuid;
    const party = payload.body.parties?.[0];
    const statusCode = party?.status?.code;

    this.logger.log(`Call status update: ${ringcentralCallId} - ${statusCode}`);

    const call = await this.callsService.findByRingCentralId(ringcentralCallId);
    if (!call) {
      this.logger.warn(`Call ${ringcentralCallId} not found for status update`);
      return;
    }

    switch (statusCode) {
      case 'Answered':
        await this.callsService.markAnswered(call.id);
        break;
      case 'Disconnected':
      case 'Finished':
        // Calculate duration if we have timestamps
        let duration: number | undefined;
        if (call.answeredAt) {
          duration = Math.round((Date.now() - call.answeredAt.getTime()) / 1000);
        }

        // Get recording URL if available
        const recording = party?.recordings?.[0];
        const recordingUrl = recording?.id
          ? `https://platform.ringcentral.com/recordings/${recording.id}`
          : undefined;

        await this.callsService.markCompleted(call.id, duration, recordingUrl);
        break;
      case 'NoAnswer':
      case 'Busy':
      case 'Rejected':
        await this.callsService.markMissed(call.id);
        break;
    }
  }

  handleValidationRequest(validationToken: string): string {
    // RingCentral sends a validation token that must be echoed back
    this.logger.log('Handling webhook validation request');
    return validationToken;
  }
}
