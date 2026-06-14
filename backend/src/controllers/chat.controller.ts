import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Loads the last 50 messages for an expense.
 * Verifies that the user is an active member of the group.
 */
export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: expenseId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify expense exists and is not deleted
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { groupId: true, deletedAt: true }
    });

    if (!expense || expense.deletedAt) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Verify user is an active member of the group
    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: expense.groupId,
          userId: userId
        }
      }
    });

    if (!member || !member.isActive) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this group' });
    }

    // Fetch last 50 messages
    const messages = await prisma.chatMessage.findMany({
      where: { expenseId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: { select: { id: true, name: true, email: true } }
      }
    });

    // Format and sort chronologically (oldest first)
    const formattedMessages = messages.reverse().map((m) => ({
      id: m.id,
      expenseId: m.expenseId,
      userId: m.senderId,
      userName: m.sender.name,
      content: m.content,
      createdAt: m.createdAt
    }));

    return res.status(200).json({
      data: formattedMessages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft deletes a chat message (updates content to null and sets deletedAt).
 */
export const deleteMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own messages' });
    }

    // Soft delete chat message: set content to null and deletedAt timestamp
    await prisma.chatMessage.update({
      where: { id },
      data: {
        content: null,
        deletedAt: new Date()
      }
    });

    return res.status(200).json({
      data: { id },
      message: 'This message was deleted.'
    });
  } catch (error) {
    next(error);
  }
};
