import { Injectable, BadRequestException } from '@nestjs/common';
import { RedisService } from '../../config/redis.config';
import { EmailService } from './email.service';
import * as crypto from 'crypto';

@Injectable()
export class OtpService {
  constructor(
    private redisService: RedisService,
    private emailService: EmailService,
  ) {}

  async checkOtpRestriction(email: string): Promise<void> {
    const lockKey = `otp_lock:${email}`;
    const spamLockKey = `otp_spam_lock:${email}`;
    const cooldownKey = `otp_cooldown:${email}`;

    if (await this.redisService.get(lockKey)) {
      throw new BadRequestException('Too many failed attempts. Try again in 30 minutes.');
    }

    if (await this.redisService.get(spamLockKey)) {
      throw new BadRequestException('Too many OTP requests. Try again in 1 hour.');
    }

    if (await this.redisService.get(cooldownKey)) {
      throw new BadRequestException('Wait a minute before requesting another OTP.');
    }
  }

  async trackOtpRequest(email: string): Promise<void> {
    const countKey = `otp_request_count:${email}`;
    const countStr = await this.redisService.get(countKey);
    const count = parseInt(countStr || '0', 10);

    if (count >= 2) {
      await this.redisService.set(`otp_spam_lock:${email}`, 'locked', 3600);
      throw new BadRequestException('Too many OTP requests. Try again in 1 hour.');
    }

    await this.redisService.set(countKey, (count + 1).toString(), 3600);
  }

  async sendOtp(name: string, email: string): Promise<void> {
    const otp = crypto.randomInt(1000, 9999).toString();
    const message = `Hello ${name},\n\nYour password reset code is: ${otp}.\nIt is valid for 5 minutes.`;
    const html = this.emailService.generateOtpTemplate(name, otp);

    await this.emailService.sendEmail(email, 'Reset Your Password', message, html);
    await this.redisService.set(`otp:${email}`, otp, 300); // 5 minutes
    await this.redisService.set(`otp_cooldown:${email}`, 'true', 60); // 1 minute cooldown
  }

  async verifyOtp(email: string, otp: string): Promise<void> {
    const storedOtp = await this.redisService.get(`otp:${email}`);
    const failKey = `otp_attempts:${email}`;

    if (!storedOtp) {
      throw new BadRequestException('OTP expired or invalid');
    }

    const failed = parseInt((await this.redisService.get(failKey)) || '0', 10);

    if (otp !== storedOtp) {
      if (failed >= 2) {
        await this.redisService.set(`otp_lock:${email}`, 'locked', 1800); // 30 min lock
        await this.redisService.del(`otp:${email}`, failKey);
        throw new BadRequestException('Too many failed attempts. Account locked for 30 minutes.');
      }
      await this.redisService.set(failKey, (failed + 1).toString(), 1800);
      throw new BadRequestException(`Incorrect OTP. ${2 - failed} attempts left.`);
    }

    await this.redisService.del(`otp:${email}`, failKey);
    await this.redisService.set(`otp_verified:${email}`, 'true', 600); // 10 min
  }
}
