import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Gallery, GalleryDocument } from './schemas/gallery.schema';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';
import { CloudinaryService } from '../common/services/cloudinary.service';

@Injectable()
export class GalleryService {
  constructor(
    @InjectModel(Gallery.name) private galleryModel: Model<GalleryDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(createGalleryDto: CreateGalleryDto, file?: Express.Multer.File) {
    let imageUrl = createGalleryDto.image;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(file, 'gallery');
      imageUrl = uploadResult.secure_url;
    } else if (!imageUrl) {
      throw new Error('Image is required. Please provide either a file upload or an image URL.');
    }

    const gallery = await this.galleryModel.create({
      ...createGalleryDto,
      image: imageUrl,
    });

    return {
      success: true,
      message: 'Gallery item created successfully',
      data: gallery,
    };
  }

  async findAll(published?: boolean) {
    const filter = published !== undefined ? { published } : {};
    const galleries = await this.galleryModel.find(filter).sort({ order: 1, createdAt: -1 }).exec();

    return {
      success: true,
      message: 'Gallery items retrieved successfully',
      data: galleries,
      count: galleries.length,
    };
  }

  async findOne(id: string) {
    const gallery = await this.galleryModel.findById(id).exec();

    if (!gallery) {
      throw new NotFoundException(`Gallery item with id "${id}" not found`);
    }

    return {
      success: true,
      message: 'Gallery item retrieved successfully',
      data: gallery,
    };
  }

  async update(id: string, updateGalleryDto: UpdateGalleryDto, file?: Express.Multer.File) {
    let imageUrl = updateGalleryDto.image;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(file, 'gallery');
      imageUrl = uploadResult.secure_url;
    }

    const updateData = file ? { ...updateGalleryDto, image: imageUrl } : updateGalleryDto;

    const gallery = await this.galleryModel.findByIdAndUpdate(id, updateData, { new: true }).exec();

    if (!gallery) {
      throw new NotFoundException(`Gallery item with id "${id}" not found`);
    }

    return {
      success: true,
      message: 'Gallery item updated successfully',
      data: gallery,
    };
  }

  async remove(id: string): Promise<void> {
    const result = await this.galleryModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Gallery item with id "${id}" not found`);
    }
  }

  async getCategories() {
    const categories = await this.galleryModel.distinct('category').exec();
    return {
      success: true,
      message: 'Gallery categories retrieved successfully',
      data: categories,
      count: categories.length,
    };
  }

  async findByCategory(category: string) {
    const galleries = await this.galleryModel
      .find({ category, published: true })
      .sort({ order: 1, createdAt: -1 })
      .exec();

    return {
      success: true,
      message: 'Gallery items retrieved successfully',
      data: galleries,
      count: galleries.length,
    };
  }
}
