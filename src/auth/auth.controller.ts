import {
  Controller,
  Post,
  Get,
  Body,
  Patch,
  UseGuards,
  Request,
  Res,
  UseInterceptors,
  UploadedFile,
  UsePipes,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { AuthRateLimit, StrictRateLimit } from '../common/decorators/rate-limit.decorator';
import { multerConfig } from '../common/middlewares/multer.config';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  ChangePasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { UpdateProfileWithFileDto } from './dto/update-profile-with-file.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // @Public()
  // @AuthRateLimit()
  // @Post('register')
  // @ApiOperation({ summary: 'Register new admin user' })
  // register(@Body() registerDto: RegisterDto, @Res() res: Response, @Request() req) {
  //   return this.authService.register(registerDto, res, req);
  // }

  @Public()
  @AuthRateLimit()
  @Post('login')
  @ApiOperation({ summary: 'Login with session management' })
  login(@Body() loginDto: LoginDto, @Res() res: Response, @Request() req) {
    return this.authService.login(loginDto, res, req);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current logged-in user information' })
  getMe(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile with optional image upload' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update profile with optional profile image file upload',
    type: UpdateProfileWithFileDto,
  })
  @UseInterceptors(FileInterceptor('profileImage', multerConfig))
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
  updateProfile(@Request() req, @Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    // Extract only the fields we need from multipart form data
    // and validate them manually
    const updateProfileDto: UpdateProfileDto = {};
    if (body.name && typeof body.name === 'string' && body.name.trim()) {
      updateProfileDto.name = body.name.trim();
    }
    if (body.email && typeof body.email === 'string' && body.email.trim()) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(body.email.trim())) {
        updateProfileDto.email = body.email.trim().toLowerCase();
      }
    }
    return this.authService.updateProfile(req.user.userId, updateProfileDto, file);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.userId, changePasswordDto);
  }

  @Public()
  @StrictRateLimit()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @StrictRateLimit()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP for password reset' })
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto.email, verifyOtpDto.otp);
  }

  @Public()
  @StrictRateLimit()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password after OTP verification' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Public()
  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token' })
  refreshToken(@Request() req, @Res() res: Response) {
    const refreshToken = req.cookies?.refresh_token || req.headers.authorization?.split(' ')[1];
    return this.authService.refreshToken(refreshToken, res, req);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from current session' })
  logout(@Request() req, @Res() res: Response) {
    return this.authService.logout(req.user.sessionId, res);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  logoutAll(@Request() req, @Res() res: Response) {
    return this.authService.logoutAll(req.user.userId, res);
  }
}
