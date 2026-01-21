import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team, TeamDocument } from './schemas/team.schema';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { CloudinaryService } from '../common/services/cloudinary.service';

@Injectable()
export class TeamService {
  constructor(
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(createTeamDto: CreateTeamDto, file?: Express.Multer.File) {
    let imageUrl = createTeamDto.image;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(file, 'team');
      imageUrl = uploadResult.secure_url;
    } else if (!imageUrl) {
      throw new Error('Image is required. Please provide either a file upload or an image URL.');
    }

    const team = await this.teamModel.create({
      ...createTeamDto,
      image: imageUrl,
    });

    return {
      success: true,
      message: 'Team member created successfully',
      data: team,
    };
  }

  async findAll(published?: boolean) {
    const filter = published !== undefined ? { published } : {};
    const teams = await this.teamModel.find(filter).sort({ order: 1, createdAt: -1 }).exec();

    return {
      success: true,
      message: 'Team members retrieved successfully',
      data: teams,
      count: teams.length,
    };
  }

  async findOne(id: string) {
    const team = await this.teamModel.findById(id).exec();

    if (!team) {
      throw new NotFoundException(`Team member with id "${id}" not found`);
    }

    return {
      success: true,
      message: 'Team member retrieved successfully',
      data: team,
    };
  }

  async update(id: string, updateTeamDto: UpdateTeamDto, file?: Express.Multer.File) {
    let imageUrl = updateTeamDto.image;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(file, 'team');
      imageUrl = uploadResult.secure_url;
    }

    const updateData = file ? { ...updateTeamDto, image: imageUrl } : updateTeamDto;

    const team = await this.teamModel.findByIdAndUpdate(id, updateData, { new: true }).exec();

    if (!team) {
      throw new NotFoundException(`Team member with id "${id}" not found`);
    }

    return {
      success: true,
      message: 'Team member updated successfully',
      data: team,
    };
  }

  async remove(id: string): Promise<void> {
    const result = await this.teamModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Team member with id "${id}" not found`);
    }
  }
}

