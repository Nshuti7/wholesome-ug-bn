import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { CreateBlogWithFileDto } from './dto/create-blog-with-file.dto';
import { UpdateBlogWithFileDto } from './dto/update-blog-with-file.dto';
import { Public } from '../common/decorators/public.decorator';
import { multerConfig } from '../common/middlewares/multer.config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create blog post with image upload' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Create blog post with image file upload',
    type: CreateBlogWithFileDto,
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
    const createBlogDto: CreateBlogDto = {
      slug: body.slug,
      title: body.title,
      excerpt: body.excerpt,
      content: body.content,
      author: body.author,
      date: body.date, // Will be validated as ISO date string
      category: body.category,
      image: body.image || '', // Will be replaced if file is uploaded
      readTime: body.readTime,
      published: body.published === 'true' || body.published === true,
      tags: Array.isArray(body.tags) 
        ? body.tags.filter((tag: any) => tag && typeof tag === 'string' && tag.trim())
        : body.tags && typeof body.tags === 'string' && body.tags.trim()
        ? [body.tags.trim()]
        : [],
    };
    return this.blogService.create(createBlogDto, file);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all blog posts' })
  @ApiQuery({ name: 'published', required: false, type: Boolean })
  findAll(@Query('published') published?: string) {
    const publishedBool = published === 'true' ? true : published === 'false' ? false : undefined;
    return this.blogService.findAll(publishedBool);
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Get all blog categories' })
  getCategories() {
    return this.blogService.getCategories();
  }

  @Public()
  @Get('category/:category')
  @ApiOperation({ summary: 'Get blog posts by category' })
  findByCategory(@Param('category') category: string) {
    return this.blogService.findByCategory(category);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get a blog post by slug' })
  findOne(@Param('slug') slug: string) {
    return this.blogService.findOne(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update blog post' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update blog post with optional image file upload',
    type: UpdateBlogWithFileDto,
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
    const updateBlogDto: UpdateBlogDto = {};
    if (body.slug) updateBlogDto.slug = body.slug;
    if (body.title) updateBlogDto.title = body.title;
    if (body.excerpt) updateBlogDto.excerpt = body.excerpt;
    if (body.content) updateBlogDto.content = body.content;
    if (body.author) updateBlogDto.author = body.author;
    if (body.date) updateBlogDto.date = body.date; // Will be validated as ISO date string
    if (body.category) updateBlogDto.category = body.category;
    if (body.image && !file) updateBlogDto.image = body.image; // Only if no new file
    if (body.readTime) updateBlogDto.readTime = body.readTime;
    if (body.published !== undefined) {
      updateBlogDto.published = body.published === 'true' || body.published === true;
    }
    if (body.tags !== undefined) {
      updateBlogDto.tags = Array.isArray(body.tags)
        ? body.tags.filter((tag: any) => tag && typeof tag === 'string' && tag.trim())
        : body.tags && typeof body.tags === 'string' && body.tags.trim()
        ? [body.tags.trim()]
        : [];
    }
    return this.blogService.update(id, updateBlogDto, file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete blog post' })
  remove(@Param('id') id: string) {
    return this.blogService.remove(id);
  }
}
