import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Creates a manual settlement payment between two group members.
 */
export const createSettlement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const { payeeId, amount, note, paymentMethod } = req.body;
    const payerId = req.user?.userId;

    if (!payerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (payerId === payeeId) {
      return res.status(400).json({ error: 'You cannot record a settlement to yourself' });
    }

    // 1. Verify group memberships
    const payerMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: payerId } }
    });

    const payeeMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: payeeId } }
    });

    if (!payerMembership || !payerMembership.isActive) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this group' });
    }

    if (!payeeMembership || !payeeMembership.isActive) {
      return res.status(400).json({ error: 'The payee is not a member of this group' });
    }

    // 2. Create settlement record
    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        payerId,
        payeeId,
        amount: Number(amount),
        note: note || null,
        paymentMethod: paymentMethod || 'CASH'
      },
      include: {
        payer: { select: { id: true, name: true, email: true } },
        payee: { select: { id: true, name: true, email: true } }
      }
    });

    return res.status(201).json({
      data: settlement,
      message: 'Settlement recorded successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists the last 5 settlements for the group.
 */
export const listSettlements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!membership || !membership.isActive) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this group' });
    }

    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        payer: { select: { id: true, name: true, email: true } },
        payee: { select: { id: true, name: true, email: true } }
      }
    });

    return res.status(200).json({
      data: settlements
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a settlement record. Restricted to payer or admin.
 */
export const deleteSettlement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const settlement = await prisma.settlement.findUnique({
      where: { id }
    });

    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    const groupMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: settlement.groupId, userId: currentUserId } }
    });

    if (!groupMembership || !groupMembership.isActive) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this group' });
    }

    const isPayer = settlement.payerId === currentUserId;
    const isAdmin = groupMembership.role === 'ADMIN';

    if (!isPayer && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Only the payer or the group admin can delete this settlement' });
    }

    await prisma.settlement.delete({
      where: { id }
    });

    return res.status(200).json({
      data: { id },
      message: 'Settlement deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
