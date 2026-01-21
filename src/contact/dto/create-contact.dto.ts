import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class CreateContactDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+256 765 051454', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'General Inquiry', required: false })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ example: 'I would like to inquire about your services' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
