import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationType } from '../generated/prisma/enums.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link ?? null,
      },
    });
  }

  async findAll(userId: string) {
    const [items, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return {
      data: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt,
      })),
      unreadCount,
    };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }
}
