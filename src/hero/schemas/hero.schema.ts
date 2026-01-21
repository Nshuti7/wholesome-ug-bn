import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HeroDocument = Hero & Document;

@Schema({ timestamps: true })
export class Hero {
  @Prop({ required: true })
  title: string;

  @Prop()
  subtitle?: string;

  @Prop({ required: true })
  image: string; // Cloudinary URL

  @Prop({ default: 'mobile' })
  displayType: 'mobile' | 'desktop-top-left' | 'desktop-top-right' | 'desktop-bottom-left' | 'desktop-bottom-right';

  @Prop({ default: 0 })
  order: number; // For ordering images

  @Prop({ default: true })
  active: boolean;

  @Prop()
  alt?: string; // Alt text for accessibility
}

export const HeroSchema = SchemaFactory.createForClass(Hero);

// Create index for ordering and active status
HeroSchema.index({ order: 1, active: 1 });


