import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

const notificationsCorsOrigin = process.env.FRONTEND_URL
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

@WebSocketGateway({
  cors: {
    origin:
      notificationsCorsOrigin.length === 1
        ? notificationsCorsOrigin[0]
        : notificationsCorsOrigin,
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  private connectedUsers: Map<string, string> = new Map();
  private onlineUsers: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const userId = this.connectedUsers.get(client.id);
    this.connectedUsers.delete(client.id);

    if (userId) {
      const userSockets = this.onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.onlineUsers.delete(userId);
        }
      }
    }
  }

  @SubscribeMessage('register_user')
  handleRegisterUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    this.connectedUsers.set(client.id, data.userId);

    if (!this.onlineUsers.has(data.userId)) {
      this.onlineUsers.set(data.userId, new Set());
    }
    this.onlineUsers.get(data.userId)!.add(client.id);

    this.logger.log(`User ${data.userId} registered with socket ${client.id}`);
    return { event: 'registered', data: { success: true } };
  }

  emitNotification(userId: string, payload: any) {
    const sockets = this.onlineUsers.get(userId);
    if (!sockets || sockets.size === 0) {
      return;
    }

    sockets.forEach((socketId) => {
      this.server.to(socketId).emit('notification', payload);
    });

    this.logger.log(`Notification emitted to user ${userId} (${sockets.size} sockets)`);
  }
}
