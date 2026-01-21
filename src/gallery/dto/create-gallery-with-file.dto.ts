import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateGalleryWithFileDto {
  @ApiProperty({ example: 'African Fashion Collection' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Gallery image (JPEG, PNG, WebP, SVG) - Max 5MB',
    required: false,
  })
  @IsOptional()
  image?: Express.Multer.File;

  @ApiProperty({ example: 'fashion' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Beautiful African fashion designs', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  published?: boolean;
}
