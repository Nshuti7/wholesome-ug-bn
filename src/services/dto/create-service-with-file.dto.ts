import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';

export class CreateServiceWithFileDto {
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

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Service image (JPEG, PNG, WebP, SVG) - Max 5MB',
    required: false,
  })
  @IsOptional()
  image?: Express.Multer.File;

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
