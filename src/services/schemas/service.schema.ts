import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ServiceDocument = Service & Document;

@Schema({ timestamps: true })
export class Service {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  icon: string;

  @Prop({ required: true })
  image: string;

  @Prop()
  longDescription: string;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: true })
  published: boolean;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

// Create index for ordering
ServiceSchema.index({ order: 1 });
