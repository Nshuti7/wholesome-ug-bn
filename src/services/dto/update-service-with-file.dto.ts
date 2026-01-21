import { PartialType } from '@nestjs/swagger';
import { CreateServiceWithFileDto } from './create-service-with-file.dto';

export class UpdateServiceWithFileDto extends PartialType(CreateServiceWithFileDto) {}
