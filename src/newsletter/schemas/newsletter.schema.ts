import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NewsletterDocument = Newsletter & Document;

@Schema({ timestamps: true })
export class Newsletter {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  unsubscribedAt: Date;
}

export const NewsletterSchema = SchemaFactory.createForClass(Newsletter);

// Note: Index is automatically created by unique: true on email property
