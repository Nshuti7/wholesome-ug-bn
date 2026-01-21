import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Blog, BlogDocument } from './schemas/blog.schema';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { CloudinaryService } from '../common/services/cloudinary.service';

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(createBlogDto: CreateBlogDto, file?: Express.Multer.File) {
    const existingBlog = await this.blogModel.findOne({ slug: createBlogDto.slug });

    if (existingBlog) {
      throw new ConflictException('Blog post with this slug already exists');
    }

    let imageUrl = createBlogDto.image;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(file, 'blog');
      imageUrl = uploadResult.secure_url;
    }

    const blog = await this.blogModel.create({
      ...createBlogDto,
      image: imageUrl,
    });

    return {
      success: true,
      message: 'Blog post created successfully',
      data: blog,
    };
  }

  async findAll(published?: boolean) {
    const filter = published !== undefined ? { published } : {};
    const blogs = await this.blogModel.find(filter).sort({ date: -1 }).exec();

    return {
      success: true,
      message: 'Blog posts retrieved successfully',
      data: blogs,
      count: blogs.length,
    };
  }

  async findOne(slug: string) {
    const blog = await this.blogModel.findOne({ slug }).exec();

    if (!blog) {
      throw new NotFoundException(`Blog post with slug "${slug}" not found`);
    }

    return {
      success: true,
      message: 'Blog post retrieved successfully',
      data: blog,
    };
  }

  async update(id: string, updateBlogDto: UpdateBlogDto, file?: Express.Multer.File) {
    if (updateBlogDto.slug) {
      const existingBlog = await this.blogModel.findOne({
        slug: updateBlogDto.slug,
        _id: { $ne: id },
      });

      if (existingBlog) {
        throw new ConflictException('Blog post with this slug already exists');
      }
    }

    let imageUrl = updateBlogDto.image;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(file, 'blog');
      imageUrl = uploadResult.secure_url;
    }

    const blog = await this.blogModel
      .findByIdAndUpdate(
        id,
        { ...updateBlogDto, ...(imageUrl && { image: imageUrl }) },
        { new: true },
      )
      .exec();

    if (!blog) {
      throw new NotFoundException(`Blog post with id "${id}" not found`);
    }

    return {
      success: true,
      message: 'Blog post updated successfully',
      data: blog,
    };
  }

  async remove(id: string) {
    const result = await this.blogModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Blog post with id "${id}" not found`);
    }

    return {
      success: true,
      message: 'Blog post deleted successfully',
    };
  }

  async getCategories() {
    const categories = await this.blogModel.distinct('category').exec();
    return {
      success: true,
      message: 'Categories retrieved successfully',
      data: categories,
    };
  }

  async findByCategory(category: string) {
    const blogs = await this.blogModel
      .find({ category, published: true })
      .sort({ date: -1 })
      .exec();

    return {
      success: true,
      message: `Blog posts in ${category} retrieved successfully`,
      data: blogs,
      count: blogs.length,
    };
  }
}
