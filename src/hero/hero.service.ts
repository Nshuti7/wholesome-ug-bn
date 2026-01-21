import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hero, HeroDocument } from './schemas/hero.schema';
import { CreateHeroDto } from './dto/create-hero.dto';
import { UpdateHeroDto } from './dto/update-hero.dto';
import { CloudinaryService } from '../common/services/cloudinary.service';
import { RevalidateUtil } from '../common/utils/revalidate.util';

@Injectable()
export class HeroService {
  constructor(
    @InjectModel(Hero.name) private heroModel: Model<HeroDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(createHeroDto: CreateHeroDto, file?: Express.Multer.File) {
    let imageUrl = createHeroDto.image;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(file, 'hero');
      imageUrl = uploadResult.secure_url;
    }

    if (!imageUrl) {
      throw new ConflictException('Image is required');
    }

    const hero = await this.heroModel.create({
      ...createHeroDto,
      image: imageUrl,
    });

    // Trigger revalidation for homepage
    RevalidateUtil.revalidateHero().catch((err) => {
      console.error('Failed to revalidate after hero creation:', err);
    });

    return {
      success: true,
      message: 'Hero image created successfully',
      data: hero,
    };
  }

  async findAll(active?: boolean) {
    const filter = active !== undefined ? { active } : {};
    const heroes = await this.heroModel
      .find(filter)
      .sort({ order: 1, createdAt: -1 })
      .exec();

    return {
      success: true,
      message: 'Hero images retrieved successfully',
      data: heroes,
      count: heroes.length,
    };
  }

  async findOne(id: string) {
    const hero = await this.heroModel.findById(id).exec();

    if (!hero) {
      throw new NotFoundException(`Hero image with id "${id}" not found`);
    }

    return {
      success: true,
      message: 'Hero image retrieved successfully',
      data: hero,
    };
  }

  async update(id: string, updateHeroDto: UpdateHeroDto, file?: Express.Multer.File) {
    const hero = await this.heroModel.findById(id).exec();

    if (!hero) {
      throw new NotFoundException(`Hero image with id "${id}" not found`);
    }

    let imageUrl = updateHeroDto.image;
    if (file) {
      // Delete old image from Cloudinary if exists
      if (hero.image) {
        try {
          await this.cloudinaryService.deleteImage(hero.image);
        } catch (error) {
          console.warn('Failed to delete old image from Cloudinary:', error);
        }
      }
      const uploadResult = await this.cloudinaryService.uploadImage(file, 'hero');
      imageUrl = uploadResult.secure_url;
    }

    const updatedHero = await this.heroModel
      .findByIdAndUpdate(
        id,
        {
          ...updateHeroDto,
          ...(imageUrl && { image: imageUrl }),
        },
        { new: true },
      )
      .exec();

    // Trigger revalidation for homepage
    RevalidateUtil.revalidateHero().catch((err) => {
      console.error('Failed to revalidate after hero update:', err);
    });

    return {
      success: true,
      message: 'Hero image updated successfully',
      data: updatedHero,
    };
  }

  async remove(id: string) {
    const hero = await this.heroModel.findById(id).exec();

    if (!hero) {
      throw new NotFoundException(`Hero image with id "${id}" not found`);
    }

    // Delete image from Cloudinary
    if (hero.image) {
      try {
        await this.cloudinaryService.deleteImage(hero.image);
      } catch (error) {
        console.warn('Failed to delete image from Cloudinary:', error);
      }
    }

    await this.heroModel.findByIdAndDelete(id).exec();

    // Trigger revalidation for homepage
    RevalidateUtil.revalidateHero().catch((err) => {
      console.error('Failed to revalidate after hero deletion:', err);
    });

    return {
      success: true,
      message: 'Hero image deleted successfully',
    };
  }
}

