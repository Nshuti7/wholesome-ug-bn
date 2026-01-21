import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateProfileWithFileDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Profile image (JPEG, PNG, WebP, SVG) - Max 5MB',
    required: false,
  })
  @IsOptional()
  profileImage?: Express.Multer.File;
}
