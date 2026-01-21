import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Service, ServiceDocument } from './schemas/service.schema';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { CloudinaryService } from '../common/services/cloudinary.service';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(createServiceDto: CreateServiceDto, file?: Express.Multer.File) {
    let imageUrl = createServiceDto.image;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(file, 'services');
      imageUrl = uploadResult.secure_url;
    } else if (!imageUrl) {
      throw new Error('Image is required. Please provide either a file upload or an image URL.');
    }

    const service = await this.serviceModel.create({
      ...createServiceDto,
      image: imageUrl,
    });

    return {
      success: true,
      message: 'Service created successfully',
      data: service,
    };
  }

  async findAll(published?: boolean) {
    const filter = published !== undefined ? { published } : {};
    const services = await this.serviceModel.find(filter).sort({ order: 1, createdAt: -1 }).exec();

    return {
      success: true,
      message: 'Services retrieved successfully',
      data: services,
      count: services.length,
    };
  }

  async findOne(id: string) {
    const service = await this.serviceModel.findById(id).exec();

    if (!service) {
      throw new NotFoundException(`Service with id "${id}" not found`);
    }

    return {
      success: true,
      message: 'Service retrieved successfully',
      data: service,
    };
  }

  async update(id: string, updateServiceDto: UpdateServiceDto, file?: Express.Multer.File) {
    let imageUrl = updateServiceDto.image;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(file, 'services');
      imageUrl = uploadResult.secure_url;
    }

    const updateData = file ? { ...updateServiceDto, image: imageUrl } : updateServiceDto;

    const service = await this.serviceModel.findByIdAndUpdate(id, updateData, { new: true }).exec();

    if (!service) {
      throw new NotFoundException(`Service with id "${id}" not found`);
    }

    return {
      success: true,
      message: 'Service updated successfully',
      data: service,
    };
  }

  async remove(id: string): Promise<void> {
    const result = await this.serviceModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Service with id "${id}" not found`);
    }
  }
}
