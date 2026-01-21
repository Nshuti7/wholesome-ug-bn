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
import { GalleryService } from './gallery.service';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';
import { CreateGalleryWithFileDto } from './dto/create-gallery-with-file.dto';
import { UpdateGalleryWithFileDto } from './dto/update-gallery-with-file.dto';
import { Public } from '../common/decorators/public.decorator';
import { multerConfig } from '../common/middlewares/multer.config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Gallery')
@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new gallery item with image upload (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Create gallery item with image file upload',
    type: CreateGalleryWithFileDto,
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
    // Image is required - either via file upload or as a string
    // If file is present, service will use it, so we use a placeholder for DTO validation
    const imageValue = file ? 'placeholder-will-be-replaced' : (body.image || '');
    
    // Validate that either file or image string is provided
    if (!file && !body.image) {
      throw new Error('Image is required. Please provide either a file upload or an image URL.');
    }
    
    const createGalleryDto: CreateGalleryDto = {
      title: body.title,
      category: body.category,
      description: body.description || undefined,
      image: imageValue, // Will be replaced by service if file is uploaded
      order: body.order !== undefined ? Number(body.order) : undefined,
      published: body.published === 'true' || body.published === true,
    };
    return this.galleryService.create(createGalleryDto, file);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all gallery items' })
  @ApiQuery({ name: 'published', required: false, type: Boolean })
  findAll(@Query('published') published?: string) {
    const publishedBool = published === 'true' ? true : published === 'false' ? false : undefined;
    return this.galleryService.findAll(publishedBool);
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Get all gallery categories' })
  getCategories() {
    return this.galleryService.getCategories();
  }

  @Public()
  @Get('category/:category')
  @ApiOperation({ summary: 'Get gallery items by category' })
  findByCategory(@Param('category') category: string) {
    return this.galleryService.findByCategory(category);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a gallery item by ID' })
  findOne(@Param('id') id: string) {
    return this.galleryService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a gallery item with optional image upload (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update gallery item with optional image file upload',
    type: UpdateGalleryWithFileDto,
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
    const updateGalleryDto: UpdateGalleryDto = {};
    if (body.title) updateGalleryDto.title = body.title;
    if (body.category) updateGalleryDto.category = body.category;
    if (body.description !== undefined) updateGalleryDto.description = body.description;
    if (body.image && !file) updateGalleryDto.image = body.image; // Only if no new file
    if (body.order !== undefined) updateGalleryDto.order = Number(body.order);
    if (body.published !== undefined) {
      updateGalleryDto.published = body.published === 'true' || body.published === true;
    }
    return this.galleryService.update(id, updateGalleryDto, file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a gallery item (Admin only)' })
  remove(@Param('id') id: string) {
    return this.galleryService.remove(id);
  }
}
