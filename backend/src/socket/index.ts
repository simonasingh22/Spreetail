import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt.utils';

const prisma = new PrismaClient();

export const initSocket = (server: HttpServer) => {
  const io = new Server(server, {
    path: process.env.SOCKET_PATH || '/socket.io',
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    }
  });

  // Handshake authentication middleware
  io.use((socket, next) => {
    try {
      const tokenString = socket.handshake.auth?.token || socket.handshake.headers['authorization'];
      
      if (!tokenString) {
        return next(new Error('Authentication error: Token is required'));
      }

      // Handle Bearer prefix if present
      const token = tokenString.startsWith('Bearer ') ? tokenString.slice(7) : tokenString;
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

    // Event: join_expense
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

        // 1. Verify expense exists
        const expense = await prisma.expense.findUnique({
          where: { id: expenseId },
          select: { groupId: true, deletedAt: true }
        });

        if (!expense || expense.deletedAt) {
          socket.emit('error', { message: 'Expense not found' });
          return;
        }

        // 2. Verify user is a member of the group
        const member = await prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId: expense.groupId,
              userId: userId
            }
          }
        });

        if (!member || !member.isActive) {
          socket.emit('error', { message: 'Forbidden: You are not a member of this group' });
          return;
        }

        // 3. Join the room
        const roomName = `expense:${expenseId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} successfully joined room ${roomName}`);
        socket.emit('joined_room', { expenseId });
      } catch (err: any) {
        console.error('Error in join_expense event:', err);
        socket.emit('error', { message: err.message || 'Failed to join expense room' });
      }
    });

    // Event: send_message
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

        // 1. Verify expense exists and is active
        const expense = await prisma.expense.findUnique({
          where: { id: expenseId },
          select: { groupId: true, deletedAt: true }
        });

        if (!expense || expense.deletedAt) {
          socket.emit('error', { message: 'Expense not found' });
          return;
        }

        // 2. Verify sender is a member of the group
        const member = await prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId: expense.groupId,
              userId: userId
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

        // 3. Save message to database
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

        // 4. Emit new_message to all clients in the expense room
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
