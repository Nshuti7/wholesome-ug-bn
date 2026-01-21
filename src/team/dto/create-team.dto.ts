import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'CEO & Founder' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiProperty({ example: 'Passionate about community development', required: false })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty({ example: ['https://twitter.com/johndoe', 'https://linkedin.com/in/johndoe'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  socialLinks?: string[];

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  published?: boolean;
}

