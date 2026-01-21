import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BlogDocument = Blog & Document;

@Schema({ timestamps: true })
export class Blog {
  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  excerpt: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  author: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  image: string;

  @Prop({ required: true })
  readTime: string;

  @Prop({ default: true })
  published: boolean;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const BlogSchema = SchemaFactory.createForClass(Blog);

// Note: Index is automatically created by unique: true on slug property
