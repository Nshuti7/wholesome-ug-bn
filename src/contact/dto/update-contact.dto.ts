import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateContactDto {
  @ApiProperty({ example: 'read', required: false })
  @IsString()
  @IsIn(['unread', 'read', 'replied'])
  @IsOptional()
  status?: string;

  @ApiProperty({ example: 'Replied via email', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
