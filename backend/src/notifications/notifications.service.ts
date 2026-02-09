import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';
import { NotificationsGateway } from './notifications.gateway';

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async createNotification(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        data: input.data ?? undefined,
      },
    });

    this.gateway.emitNotification(input.userId, notification);
    return notification;
  }

  async getNotifications(userId: string, limit = 20, offset = 0) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { items, unreadCount };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('You are not authorized to update this notification');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  }
}
