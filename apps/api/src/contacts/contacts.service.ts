import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ListContactsQuery } from './dto/list-contacts.query';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(query: ListContactsQuery) {
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;

    const where: Prisma.ContactWhereInput = {
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.accountId ? { accountId: query.accountId } : {}),
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
              { phone: { contains: query.q, mode: 'insensitive' } },
              { jobTitle: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async create(dto: CreateContactDto, actorUserId: string) {
    if (dto.accountId) {
      const account = await this.prisma.account.findUnique({
        where: { id: dto.accountId },
        select: { id: true },
      });
      if (!account) throw new BadRequestException('Account not found');
    }

    const contact = await this.prisma.contact.create({
      data: {
        fullName: dto.fullName,
        jobTitle: dto.jobTitle,
        email: dto.email,
        phone: dto.phone,
        preferredChannel: dto.preferredChannel,
        status: dto.status ?? 'ACTIVE',
        ownerId: actorUserId,
        accountId: dto.accountId,
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'contact.create',
      entityType: 'contact',
      entityId: contact.id,
      after: contact,
    });

    return contact;
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async history(id: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Contact not found');

    const [activities, auditLogs] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where: { contactId: id },
        orderBy: { occurredAt: 'desc' },
        take: 100,
      }),
      this.prisma.auditLog.findMany({
        where: { entityType: 'contact', entityId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    return { contact, activities, auditLogs };
  }

  async update(id: string, dto: UpdateContactDto, actorUserId: string) {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Contact not found');

    if (dto.accountId) {
      const account = await this.prisma.account.findUnique({
        where: { id: dto.accountId },
        select: { id: true },
      });
      if (!account) throw new BadRequestException('Account not found');
    }

    const updated = await this.prisma.contact.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        jobTitle: dto.jobTitle,
        email: dto.email,
        phone: dto.phone,
        preferredChannel: dto.preferredChannel,
        status: dto.status,
        accountId: dto.accountId,
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'contact.update',
      entityType: 'contact',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async remove(id: string, actorUserId: string) {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Contact not found');

    await this.prisma.contact.delete({ where: { id } });

    await this.auditService.log({
      actorUserId,
      action: 'contact.delete',
      entityType: 'contact',
      entityId: existing.id,
      before: existing,
    });

    return { id };
  }
}
