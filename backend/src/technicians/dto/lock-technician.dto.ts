import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LockTechnicianDto {
  @ApiProperty({ example: 'Failed to meet weekly quota' })
  @IsString()
  @MinLength(5)
  reason: string;
}
