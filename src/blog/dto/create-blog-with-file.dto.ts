import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsBoolean,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CreateBlogWithFileDto {
  @ApiProperty({ example: 'my-blog-post-title' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'My Blog Post Title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'A short excerpt of the blog post' })
  @IsString()
  @IsNotEmpty()
  excerpt: string;

  @ApiProperty({ example: '<p>Full blog post content in HTML</p>' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiProperty({ example: '2025-01-01' })
  @IsDateString()
  @IsNotEmpty()
  date: Date;

  @ApiProperty({ example: 'Technology' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Blog post image (JPEG, PNG, WebP, SVG) - Max 5MB',
    required: false,
  })
  @IsOptional()
  image?: Express.Multer.File;

  @ApiProperty({ example: '5 min read' })
  @IsString()
  @IsNotEmpty()
  readTime: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  published?: boolean;

  @ApiProperty({ example: ['tech', 'innovation'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
