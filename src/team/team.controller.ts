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
import { TeamService } from './team.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { CreateTeamWithFileDto } from './dto/create-team-with-file.dto';
import { UpdateTeamWithFileDto } from './dto/update-team-with-file.dto';
import { Public } from '../common/decorators/public.decorator';
import { multerConfig } from '../common/middlewares/multer.config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Team')
@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new team member with image upload (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Create team member with image file upload',
    type: CreateTeamWithFileDto,
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

    // Handle socialLinks array - can be string or array
    let socialLinks: string[] = [];
    if (body.socialLinks) {
      if (Array.isArray(body.socialLinks)) {
        socialLinks = body.socialLinks.filter((link: any) => link && typeof link === 'string' && link.trim());
      } else if (typeof body.socialLinks === 'string' && body.socialLinks.trim()) {
        socialLinks = [body.socialLinks.trim()];
      }
    }
    
    const createTeamDto: CreateTeamDto = {
      name: body.name,
      role: body.role,
      image: imageValue, // Will be replaced by service if file is uploaded
      bio: body.bio || undefined,
      socialLinks: socialLinks.length > 0 ? socialLinks : undefined,
      order: body.order !== undefined ? Number(body.order) : undefined,
      published: body.published === 'true' || body.published === true,
    };
    return this.teamService.create(createTeamDto, file);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all team members' })
  @ApiQuery({ name: 'published', required: false, type: Boolean })
  findAll(@Query('published') published?: string) {
    const publishedBool = published === 'true' ? true : published === 'false' ? false : undefined;
    return this.teamService.findAll(publishedBool);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a team member by ID' })
  findOne(@Param('id') id: string) {
    return this.teamService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a team member with optional image upload (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update team member with optional image file upload',
    type: UpdateTeamWithFileDto,
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
    const updateTeamDto: UpdateTeamDto = {};
    if (body.name) updateTeamDto.name = body.name;
    if (body.role) updateTeamDto.role = body.role;
    if (body.image && !file) updateTeamDto.image = body.image; // Only if no new file
    if (body.bio !== undefined) updateTeamDto.bio = body.bio;
    
    // Handle socialLinks array
    if (body.socialLinks !== undefined) {
      if (Array.isArray(body.socialLinks)) {
        updateTeamDto.socialLinks = body.socialLinks.filter((link: any) => link && typeof link === 'string' && link.trim());
      } else if (typeof body.socialLinks === 'string' && body.socialLinks.trim()) {
        updateTeamDto.socialLinks = [body.socialLinks.trim()];
      } else {
        updateTeamDto.socialLinks = [];
      }
    }
    
    if (body.order !== undefined) updateTeamDto.order = Number(body.order);
    if (body.published !== undefined) {
      updateTeamDto.published = body.published === 'true' || body.published === true;
    }
    
    return this.teamService.update(id, updateTeamDto, file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a team member (Admin only)' })
  remove(@Param('id') id: string) {
    return this.teamService.remove(id);
  }
}

