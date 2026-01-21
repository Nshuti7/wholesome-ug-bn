import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContactDocument = Contact & Document;

@Schema({ timestamps: true })
export class Contact {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  phone: string;

  @Prop()
  subject: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: 'unread' })
  status: string; // unread, read, replied

  @Prop()
  notes: string;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

// Create index for status and date
ContactSchema.index({ status: 1, createdAt: -1 });
