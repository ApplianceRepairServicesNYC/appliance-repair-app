import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteServiceRecordDto {
  @ApiPropertyOptional({ example: 'Compressor failure' })
  @IsString()
  @IsOptional()
  diagnosis?: string;

  @ApiPropertyOptional({ example: 'Replaced compressor' })
  @IsString()
  @IsOptional()
  resolution?: string;

  @ApiPropertyOptional({ example: 'Compressor, refrigerant' })
  @IsString()
  @IsOptional()
  partsUsed?: string;

  @ApiPropertyOptional({ example: 2.5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  laborHours?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
