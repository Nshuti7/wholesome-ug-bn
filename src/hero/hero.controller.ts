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
} from '@nestjs/swagger';
import { HeroService } from './hero.service';
import { CreateHeroDto } from './dto/create-hero.dto';
import { UpdateHeroDto } from './dto/update-hero.dto';
import { CreateHeroWithFileDto } from './dto/create-hero-with-file.dto';
import { UpdateHeroWithFileDto } from './dto/update-hero-with-file.dto';
import { Public } from '../common/decorators/public.decorator';
import { multerConfig } from '../common/middlewares/multer.config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Hero')
@Controller('hero')
export class HeroController {
  constructor(private readonly heroService: HeroService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create hero image with upload' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Create hero image with file upload',
    type: CreateHeroWithFileDto,
  })
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      skipMissingProperties: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )
  create(@Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    const createHeroDto: CreateHeroDto = {
      title: body.title,
      subtitle: body.subtitle,
      image: body.image || '',
      displayType: body.displayType || 'mobile',
      order: body.order ? parseInt(body.order) : 0,
      active: body.active === 'true' || body.active === true,
      alt: body.alt,
    };
    return this.heroService.create(createHeroDto, file);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all hero images' })
  @ApiBody({ required: false })
  findAll(@Query('active') active?: string) {
    const activeBool = active === 'true' ? true : active === 'false' ? false : undefined;
    return this.heroService.findAll(activeBool);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a hero image by ID' })
  findOne(@Param('id') id: string) {
    return this.heroService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update hero image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update hero image with optional file upload',
    type: UpdateHeroWithFileDto,
  })
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      skipMissingProperties: true,
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
    const updateHeroDto: UpdateHeroDto = {};
    if (body.title) updateHeroDto.title = body.title;
    if (body.subtitle) updateHeroDto.subtitle = body.subtitle;
    if (body.image && !file) updateHeroDto.image = body.image;
    if (body.displayType) updateHeroDto.displayType = body.displayType;
    if (body.order !== undefined) updateHeroDto.order = parseInt(body.order);
    if (body.active !== undefined) {
      updateHeroDto.active = body.active === 'true' || body.active === true;
    }
    if (body.alt) updateHeroDto.alt = body.alt;
    return this.heroService.update(id, updateHeroDto, file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete hero image' })
  remove(@Param('id') id: string) {
    return this.heroService.remove(id);
  }
}

