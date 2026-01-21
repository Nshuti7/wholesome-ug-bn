import { PartialType } from '@nestjs/swagger';
import { CreateBlogWithFileDto } from './create-blog-with-file.dto';

export class UpdateBlogWithFileDto extends PartialType(CreateBlogWithFileDto) {}
