import { PartialType } from '@nestjs/swagger';
import { CreateGalleryWithFileDto } from './create-gallery-with-file.dto';

export class UpdateGalleryWithFileDto extends PartialType(CreateGalleryWithFileDto) {}
