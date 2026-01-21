import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact, ContactDocument } from './schemas/contact.schema';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactService {
  constructor(@InjectModel(Contact.name) private contactModel: Model<ContactDocument>) {}

  async create(createContactDto: CreateContactDto): Promise<Contact> {
    const contact = new this.contactModel(createContactDto);
    return contact.save();
  }

  async findAll(status?: string): Promise<Contact[]> {
    const filter = status ? { status } : {};
    return this.contactModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Contact> {
    const contact = await this.contactModel.findById(id).exec();

    if (!contact) {
      throw new NotFoundException(`Contact submission with id "${id}" not found`);
    }

    return contact;
  }

  async update(id: string, updateContactDto: UpdateContactDto): Promise<Contact> {
    const contact = await this.contactModel
      .findByIdAndUpdate(id, updateContactDto, { new: true })
      .exec();

    if (!contact) {
      throw new NotFoundException(`Contact submission with id "${id}" not found`);
    }

    return contact;
  }

  async remove(id: string): Promise<void> {
    const result = await this.contactModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Contact submission with id "${id}" not found`);
    }
  }

  async getStats() {
    const total = await this.contactModel.countDocuments().exec();
    const unread = await this.contactModel.countDocuments({ status: 'unread' }).exec();
    const read = await this.contactModel.countDocuments({ status: 'read' }).exec();
    const replied = await this.contactModel.countDocuments({ status: 'replied' }).exec();

    return { total, unread, read, replied };
  }
}
