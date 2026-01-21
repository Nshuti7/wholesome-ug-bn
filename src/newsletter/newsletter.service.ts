import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Newsletter, NewsletterDocument } from './schemas/newsletter.schema';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class NewsletterService {
  constructor(@InjectModel(Newsletter.name) private newsletterModel: Model<NewsletterDocument>) {}

  async subscribe(subscribeDto: SubscribeDto): Promise<Newsletter> {
    const existingSubscription = await this.newsletterModel.findOne({
      email: subscribeDto.email,
    });

    if (existingSubscription && existingSubscription.isActive) {
      throw new ConflictException('This email is already subscribed');
    }

    if (existingSubscription && !existingSubscription.isActive) {
      // Reactivate subscription
      existingSubscription.isActive = true;
      existingSubscription.unsubscribedAt = undefined;
      return existingSubscription.save();
    }

    const newsletter = new this.newsletterModel(subscribeDto);
    return newsletter.save();
  }

  async unsubscribe(email: string): Promise<void> {
    const subscription = await this.newsletterModel.findOne({ email });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.isActive = false;
    subscription.unsubscribedAt = new Date();
    await subscription.save();
  }

  async findAll(isActive?: boolean): Promise<Newsletter[]> {
    const filter = isActive !== undefined ? { isActive } : {};
    return this.newsletterModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Newsletter> {
    const newsletter = await this.newsletterModel.findById(id).exec();

    if (!newsletter) {
      throw new NotFoundException(`Newsletter subscription with id "${id}" not found`);
    }

    return newsletter;
  }

  async remove(id: string): Promise<void> {
    const result = await this.newsletterModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Newsletter subscription with id "${id}" not found`);
    }
  }

  async getStats() {
    const total = await this.newsletterModel.countDocuments().exec();
    const active = await this.newsletterModel.countDocuments({ isActive: true }).exec();
    const inactive = await this.newsletterModel.countDocuments({ isActive: false }).exec();

    return { total, active, inactive };
  }
}
