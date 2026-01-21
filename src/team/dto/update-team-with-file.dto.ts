import { ApiProperty } from '@nestjs/swagger';

export class UpdateTeamWithFileDto {
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  image?: any;

  @ApiProperty({ example: 'John Doe', required: false })
  name?: string;

  @ApiProperty({ example: 'CEO & Founder', required: false })
  role?: string;

  @ApiProperty({ example: 'Passionate about community development', required: false })
  bio?: string;

  @ApiProperty({ example: ['https://twitter.com/johndoe'], required: false })
  socialLinks?: string[];

  @ApiProperty({ example: 1, required: false })
  order?: number;

  @ApiProperty({ example: true, required: false })
  published?: boolean;
}

