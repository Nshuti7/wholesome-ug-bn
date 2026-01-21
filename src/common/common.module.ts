import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CloudinaryService } from './services/cloudinary.service';
import { EmailService } from './services/email.service';
import { OtpService } from './services/otp.service';
import { RedisService } from '../config/redis.config';
import { TokenUtil } from './utils/token.util';

@Global()
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [CloudinaryService, EmailService, OtpService, RedisService, TokenUtil],
  exports: [CloudinaryService, EmailService, OtpService, RedisService, TokenUtil],
})
export class CommonModule {}
