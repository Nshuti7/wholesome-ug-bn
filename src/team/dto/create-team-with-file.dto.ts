import { ApiProperty } from '@nestjs/swagger';

export class CreateTeamWithFileDto {
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  image?: any;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'CEO & Founder' })
  role: string;

  @ApiProperty({ example: 'Passionate about community development', required: false })
  bio?: string;

  @ApiProperty({ example: ['https://twitter.com/johndoe'], required: false })
  socialLinks?: string[];

  @ApiProperty({ example: 1, required: false })
  order?: number;

  @ApiProperty({ example: true, required: false })
  published?: boolean;
}

