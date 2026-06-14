import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt.utils';

const prisma = new PrismaClient();

export const initSocket = (server: HttpServer) => {
  const io = new Server(server, {
    path: process.env.SOCKET_PATH || '/socket.io',
    cors: {
      origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    }
  });

  io.use((socket, next) => {
    try {
      const tokenString =
        socket.handshake.auth?.token || socket.handshake.headers['authorization'];

      if (!tokenString || typeof tokenString !== 'string') {
        return next(new Error('Authentication error: Token is required'));
      }

      const token = tokenString.startsWith('Bearer ')
        ? tokenString.slice(7)
        : tokenString;

      const decoded = verifyAccessToken(token);

      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;

      next();
    } catch (err) {
      console.error('Socket connection authentication failed:', err);
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id} (user: ${socket.data.userId})`);

    socket.on('join_expense', async ({ expenseId }) => {
      try {
        const userId = socket.data.userId;

        if (!userId) {
          socket.emit('error', { message: 'Unauthorized: User ID missing' });
          return;
        }

        if (!expenseId) {
          socket.emit('error', { message: 'Missing expenseId parameter' });
          return;
        }

        const expense = await prisma.expense.findUnique({
          where: { id: expenseId },
          select: { groupId: true, deletedAt: true }
        });

        if (!expense || expense.deletedAt) {
          socket.emit('error', { message: 'Expense not found' });
          return;
        }

        const member = await prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId: expense.groupId,
              userId
            }
          }
        });

        if (!member || !member.isActive) {
          socket.emit('error', { message: 'Forbidden: You are not a member of this group' });
          return;
        }

        const roomName = `expense:${expenseId}`;
        socket.join(roomName);

        console.log(`Socket ${socket.id} successfully joined room ${roomName}`);
        socket.emit('joined_room', { expenseId });
      } catch (err: any) {
        console.error('Error in join_expense event:', err);
        socket.emit('error', { message: err.message || 'Failed to join expense room' });
      }
    });

    socket.on('send_message', async ({ expenseId, content }) => {
      try {
        const userId = socket.data.userId;

        if (!userId) {
          socket.emit('error', { message: 'Unauthorized: User ID missing' });
          return;
        }

        if (!expenseId) {
          socket.emit('error', { message: 'Missing expenseId parameter' });
          return;
        }

        if (!content || content.trim().length === 0) {
          socket.emit('error', { message: 'Message content cannot be empty' });
          return;
        }

        if (content.length > 1000) {
          socket.emit('error', { message: 'Message content cannot exceed 1000 characters' });
          return;
        }

        const expense = await prisma.expense.findUnique({
          where: { id: expenseId },
          select: { groupId: true, deletedAt: true }
        });

        if (!expense || expense.deletedAt) {
          socket.emit('error', { message: 'Expense not found' });
          return;
        }

        const member = await prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId: expense.groupId,
              userId
            }
          },
          include: {
            user: { select: { name: true } }
          }
        });

        if (!member || !member.isActive) {
          socket.emit('error', { message: 'Forbidden: You are not a member of this group' });
          return;
        }

        const message = await prisma.chatMessage.create({
          data: {
            expenseId,
            senderId: userId,
            content: content.trim()
          },
          include: {
            sender: { select: { id: true, name: true, email: true } }
          }
        });

        const roomName = `expense:${expenseId}`;

        io.to(roomName).emit('new_message', {
          id: message.id,
          expenseId: message.expenseId,
          userId: message.senderId,
          userName: message.sender.name,
          content: message.content,
          createdAt: message.createdAt
        });
      } catch (err: any) {
        console.error('Error in send_message event:', err);
        socket.emit('error', { message: err.message || 'Failed to broadcast message' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};