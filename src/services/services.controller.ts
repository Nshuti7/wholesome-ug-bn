import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { CreateServiceWithFileDto } from './dto/create-service-with-file.dto';
import { UpdateServiceWithFileDto } from './dto/update-service-with-file.dto';
import { Public } from '../common/decorators/public.decorator';
import { multerConfig } from '../common/middlewares/multer.config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new service with image upload (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Create service with image file upload',
    type: CreateServiceWithFileDto,
  })
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra fields from multipart form
      transform: true,
      skipMissingProperties: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )
  create(@Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    // Extract and transform fields from multipart form data
    const imageValue = file ? 'placeholder-will-be-replaced' : (body.image || '');
    
    // Validate that either file or image string is provided
    if (!file && !body.image) {
      throw new Error('Image is required. Please provide either a file upload or an image URL.');
    }

    // Handle features array - can be string or array
    let features: string[] = [];
    if (body.features) {
      if (Array.isArray(body.features)) {
        features = body.features.filter((f: any) => f && typeof f === 'string' && f.trim());
      } else if (typeof body.features === 'string' && body.features.trim()) {
        features = [body.features.trim()];
      }
    }
    
    const createServiceDto: CreateServiceDto = {
      title: body.title,
      description: body.description,
      icon: body.icon,
      image: imageValue, // Will be replaced by service if file is uploaded
      longDescription: body.longDescription || undefined,
      features: features.length > 0 ? features : undefined,
      order: body.order !== undefined ? Number(body.order) : undefined,
      published: body.published === 'true' || body.published === true,
    };
    return this.servicesService.create(createServiceDto, file);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all services' })
  @ApiQuery({ name: 'published', required: false, type: Boolean })
  findAll(@Query('published') published?: string) {
    const publishedBool = published === 'true' ? true : published === 'false' ? false : undefined;
    return this.servicesService.findAll(publishedBool);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a service by ID' })
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a service with optional image upload (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update service with optional image file upload',
    type: UpdateServiceWithFileDto,
  })
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra fields from multipart form
      transform: true,
      skipMissingProperties: true, // Skip validation for missing optional fields
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )
  update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Extract and transform fields from multipart form data
    const updateServiceDto: UpdateServiceDto = {};
    if (body.title) updateServiceDto.title = body.title;
    if (body.description) updateServiceDto.description = body.description;
    if (body.icon) updateServiceDto.icon = body.icon;
    if (body.image && !file) updateServiceDto.image = body.image; // Only if no new file
    if (body.longDescription !== undefined) updateServiceDto.longDescription = body.longDescription;
    
    // Handle features array
    if (body.features !== undefined) {
      if (Array.isArray(body.features)) {
        updateServiceDto.features = body.features.filter((f: any) => f && typeof f === 'string' && f.trim());
      } else if (typeof body.features === 'string' && body.features.trim()) {
        updateServiceDto.features = [body.features.trim()];
      } else {
        updateServiceDto.features = [];
      }
    }
    
    if (body.order !== undefined) updateServiceDto.order = Number(body.order);
    if (body.published !== undefined) {
      updateServiceDto.published = body.published === 'true' || body.published === true;
    }
    
    return this.servicesService.update(id, updateServiceDto, file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a service (Admin only)' })
  remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }
}
