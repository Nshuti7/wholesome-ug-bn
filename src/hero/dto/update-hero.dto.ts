import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsIn } from 'class-validator';

export class UpdateHeroDto {
  @ApiProperty({ example: 'African Fashion Showcase', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'Celebrating African culture through fashion', required: false })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/...', required: false })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiProperty({ 
    example: 'mobile',
    enum: ['mobile', 'desktop-top-left', 'desktop-top-right', 'desktop-bottom-left', 'desktop-bottom-right'],
    required: false 
  })
  @IsString()
  @IsIn(['mobile', 'desktop-top-left', 'desktop-top-right', 'desktop-bottom-left', 'desktop-bottom-right'])
  @IsOptional()
  displayType?: string;

  @ApiProperty({ example: 0, required: false })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiProperty({ example: 'African fashion model', required: false })
  @IsString()
  @IsOptional()
  alt?: string;
}


