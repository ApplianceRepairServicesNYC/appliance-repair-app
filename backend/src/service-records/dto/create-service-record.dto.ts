import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceRecordDto {
  @ApiProperty()
  @IsString()
  technicianId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  callId?: string;

  @ApiProperty({ example: 'John Customer' })
  @IsString()
  customerName: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  customerPhone: string;

  @ApiPropertyOptional({ example: '123 Main St, City, ST 12345' })
  @IsString()
  @IsOptional()
  customerAddress?: string;

  @ApiProperty({ example: 'Refrigerator' })
  @IsString()
  applianceType: string;

  @ApiProperty({ example: 'Not cooling properly' })
  @IsString()
  issueDescription: string;

  @ApiPropertyOptional({ example: '2024-01-15T09:00:00Z' })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
