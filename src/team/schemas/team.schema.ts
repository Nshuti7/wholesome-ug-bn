import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TeamDocument = Team & Document;

@Schema({ timestamps: true })
export class Team {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true })
  image: string;

  @Prop()
  bio: string;

  @Prop({ type: [String], default: [] })
  socialLinks: string[];

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: true })
  published: boolean;
}

export const TeamSchema = SchemaFactory.createForClass(Team);

// Create index for order
TeamSchema.index({ order: 1, createdAt: -1 });

