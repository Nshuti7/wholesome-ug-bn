import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'Fashion & Apparel' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Contemporary African fashion designs' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Shirt' })
  @IsString()
  @IsNotEmpty()
  icon: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiProperty({ example: 'Detailed description of the service', required: false })
  @IsString()
  @IsOptional()
  longDescription?: string;

  @ApiProperty({ example: ['Custom designs', 'Quality materials'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  published?: boolean;
}
