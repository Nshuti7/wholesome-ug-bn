import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Blog, BlogSchema } from '../blog/schemas/blog.schema';
import { Gallery, GallerySchema } from '../gallery/schemas/gallery.schema';
import { Service, ServiceSchema } from '../services/schemas/service.schema';
import { Contact, ContactSchema } from '../contact/schemas/contact.schema';
import { Newsletter, NewsletterSchema } from '../newsletter/schemas/newsletter.schema';
import { Team, TeamSchema } from '../team/schemas/team.schema';
import { Hero, HeroSchema } from '../hero/schemas/hero.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Blog.name, schema: BlogSchema },
      { name: Gallery.name, schema: GallerySchema },
      { name: Service.name, schema: ServiceSchema },
      { name: Contact.name, schema: ContactSchema },
      { name: Newsletter.name, schema: NewsletterSchema },
      { name: Team.name, schema: TeamSchema },
      { name: Hero.name, schema: HeroSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
