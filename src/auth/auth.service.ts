import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as jwt from 'jsonwebtoken';
import { User, UserDocument } from './schemas/user.schema';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import { TokenUtil } from '../common/utils/token.util';
import { OtpService } from '../common/services/otp.service';
import { RedisService } from '../config/redis.config';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from '../common/services/cloudinary.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private tokenUtil: TokenUtil,
    private otpService: OtpService,
    private redisService: RedisService,
    private configService: ConfigService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async register(registerDto: RegisterDto, res: any, req: any) {
    const existingUser = await this.userModel.findOne({
      email: registerDto.email,
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = await this.userModel.create(registerDto);

    await this.tokenUtil.sendTokenResponse(user._id.toString(), user.email, user.role, res, req);
  }

  async login(loginDto: LoginDto, res: any, req: any) {
    const user = await this.userModel.findOne({ email: loginDto.email }).select('+password');

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await user.comparePassword(loginDto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.tokenUtil.sendTokenResponse(user._id.toString(), user.email, user.role, res, req);
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    };
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    file?: Express.Multer.File,
  ) {
    // Check if there's anything to update
    if (!file && Object.keys(updateProfileDto).length === 0) {
      throw new BadRequestException('No fields provided to update');
    }

    let profileImageUrl: string | undefined;

    // Upload image if provided
    if (file) {
      try {
        const uploadResult = await this.cloudinaryService.uploadImage(file, 'profiles');
        profileImageUrl = uploadResult.secure_url;
      } catch (error) {
        console.error('🔴 Cloudinary upload error:', error);
        throw new BadRequestException('Failed to upload profile image');
      }
    }

    const updateData: any = { ...updateProfileDto };
    if (file && profileImageUrl) {
      updateData.profileImage = profileImageUrl;
    }

    // Only update if there's data to update
    if (Object.keys(updateData).length === 0) {
      // Just return current user if nothing to update
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return {
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profileImage: user.profileImage,
        },
      };
    }

    const user = await this.userModel.findByIdAndUpdate(userId, updateData, { new: true });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userModel.findById(userId).select('+password');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await user.comparePassword(changePasswordDto.currentPassword);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = changePasswordDto.newPassword;
    await user.save();

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.userModel.findOne({
      email: forgotPasswordDto.email,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.otpService.checkOtpRestriction(user.email);
    await this.otpService.trackOtpRequest(user.email);
    await this.otpService.sendOtp(user.name, user.email);

    return {
      success: true,
      message: 'OTP sent to your email.',
    };
  }

  async verifyOtp(email: string, otp: string) {
    await this.otpService.verifyOtp(email, otp);
    return {
      success: true,
      message: 'OTP verified. You can now reset your password.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const isVerified = await this.redisService.get(`otp_verified:${resetPasswordDto.email}`);
    const otpExists = await this.redisService.get(`otp:${resetPasswordDto.email}`);

    if (!isVerified) {
      const msg = otpExists
        ? 'You have not yet verified your OTP. Please check your email and verify.'
        : 'You must request and verify an OTP before resetting your password.';
      throw new BadRequestException(msg);
    }

    const user = await this.userModel
      .findOne({ email: resetPasswordDto.email })
      .select('+password');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if new password is different from old
    const isSamePassword = await user.comparePassword(resetPasswordDto.newPassword);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from the old password');
    }

    user.password = resetPasswordDto.newPassword;
    await user.save();

    await this.tokenUtil.invalidateAllUserSessions(user._id.toString());
    await this.redisService.del(`otp_verified:${resetPasswordDto.email}`);

    return {
      success: true,
      message: 'Password reset successful',
    };
  }

  async refreshToken(refreshToken: string, res: any, req: any) {
    if (!refreshToken) {
      throw new BadRequestException('No refresh token provided');
    }

    try {
      // Verify JWT token
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      const decoded = jwt.verify(refreshToken, jwtSecret) as any;

      if (!decoded || !decoded.jti || !decoded.id) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify session exists and matches
      const session = await this.tokenUtil.getSession(decoded.jti);
      if (
        !session ||
        session.refreshToken !== refreshToken ||
        session.userId !== decoded.id.toString()
      ) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Delete old session
      await this.tokenUtil.deleteSession(decoded.jti);

      // Create new session
      const user = await this.userModel.findById(decoded.id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      await this.tokenUtil.sendTokenResponse(user._id.toString(), user.email, user.role, res, req);
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(sessionId: string, res: any) {
    await this.tokenUtil.deleteSession(sessionId);
    const cookieOptions = this.tokenUtil.getCookieOptions();
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async logoutAll(userId: string, res: any) {
    await this.tokenUtil.invalidateAllUserSessions(userId);
    const cookieOptions = this.tokenUtil.getCookieOptions();
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
    return {
      success: true,
      message: 'Logged out from all devices',
    };
  }
}
