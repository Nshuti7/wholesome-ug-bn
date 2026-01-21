import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsIn } from 'class-validator';

export class CreateHeroWithFileDto {
  @ApiProperty({ example: 'African Fashion Showcase' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Celebrating African culture through fashion', required: false })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  image?: Express.Multer.File;

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


