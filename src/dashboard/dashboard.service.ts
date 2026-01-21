import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Blog, BlogDocument } from '../blog/schemas/blog.schema';
import { Gallery, GalleryDocument } from '../gallery/schemas/gallery.schema';
import { Service, ServiceDocument } from '../services/schemas/service.schema';
import { Contact, ContactDocument } from '../contact/schemas/contact.schema';
import { Newsletter, NewsletterDocument } from '../newsletter/schemas/newsletter.schema';
import { Team, TeamDocument } from '../team/schemas/team.schema';
import { Hero, HeroDocument } from '../hero/schemas/hero.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
    @InjectModel(Gallery.name) private galleryModel: Model<GalleryDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
    @InjectModel(Newsletter.name) private newsletterModel: Model<NewsletterDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(Hero.name) private heroModel: Model<HeroDocument>,
  ) {}

  async getStats() {
    try {
      // Get counts
      const [
        totalBlogPosts,
        publishedBlogPosts,
        totalGalleryItems,
        publishedGalleryItems,
        totalServices,
        publishedServices,
        totalContacts,
        unreadContacts,
        totalSubscribers,
        activeSubscribers,
        totalTeamMembers,
        publishedTeamMembers,
        totalHeroImages,
        activeHeroImages,
      ] = await Promise.all([
        this.blogModel.countDocuments(),
        this.blogModel.countDocuments({ published: true }),
        this.galleryModel.countDocuments(),
        this.galleryModel.countDocuments({ published: true }),
        this.serviceModel.countDocuments(),
        this.serviceModel.countDocuments({ published: true }),
        this.contactModel.countDocuments(),
        this.contactModel.countDocuments({ status: 'unread' }),
        this.newsletterModel.countDocuments(),
        this.newsletterModel.countDocuments({ isActive: true }),
        this.teamModel.countDocuments(),
        this.teamModel.countDocuments({ published: true }),
        this.heroModel.countDocuments(),
        this.heroModel.countDocuments({ active: true }),
      ]);

      // Get monthly statistics (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyContacts = await this.contactModel.aggregate([
        {
          $match: {
            createdAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 },
        },
      ]);

      const monthlySubscribers = await this.newsletterModel.aggregate([
        {
          $match: {
            subscribedAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$subscribedAt' },
              month: { $month: '$subscribedAt' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 },
        },
      ]);

      // Get content distribution by category
      const blogCategories = await this.blogModel.aggregate([
        { $match: { published: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      const galleryCategories = await this.galleryModel.aggregate([
        { $match: { published: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      return {
        success: true,
        data: {
          overview: {
            blogPosts: {
              total: totalBlogPosts,
              published: publishedBlogPosts,
              draft: totalBlogPosts - publishedBlogPosts,
            },
            gallery: {
              total: totalGalleryItems,
              published: publishedGalleryItems,
              draft: totalGalleryItems - publishedGalleryItems,
            },
            services: {
              total: totalServices,
              published: publishedServices,
              draft: totalServices - publishedServices,
            },
            contacts: {
              total: totalContacts,
              unread: unreadContacts,
              read: totalContacts - unreadContacts,
            },
            newsletter: {
              total: totalSubscribers,
              active: activeSubscribers,
              inactive: totalSubscribers - activeSubscribers,
            },
            team: {
              total: totalTeamMembers,
              published: publishedTeamMembers,
              draft: totalTeamMembers - publishedTeamMembers,
            },
            hero: {
              total: totalHeroImages,
              active: activeHeroImages,
              inactive: totalHeroImages - activeHeroImages,
            },
          },
          monthly: {
            contacts: monthlyContacts.map((item) => ({
              month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
              count: item.count,
            })),
            subscribers: monthlySubscribers.map((item) => ({
              month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
              count: item.count,
            })),
          },
          distribution: {
            blogCategories: blogCategories.map((item) => ({
              category: item._id,
              count: item.count,
            })),
            galleryCategories: galleryCategories.map((item) => ({
              category: item._id,
              count: item.count,
            })),
          },
        },
      };
    } catch (error) {
      throw error;
    }
  }
}
