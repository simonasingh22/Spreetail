import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Creates a new expense in a group and distributes splits.
 */
export const createExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const { description, amount, date, paidById, splitMethod, participants, immediateSettlement, paymentMethod } = req.body;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 1. Verify group membership of current user
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: currentUserId } }
    });
    if (!membership || !membership.isActive) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this group' });
    }

    // 2. Validate participants exist in group
    const participantIds = participants.map((p: any) => p.userId);
    const memberRecords = await prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { in: [...participantIds, paidById] },
        isActive: true
      }
    });

    // Verify all participants and the payer are active group members
    const activeMemberIds = new Set(memberRecords.map(m => m.userId));
    for (const id of participantIds) {
      if (!activeMemberIds.has(id)) {
        return res.status(400).json({ error: `User ${id} is not an active member of this group` });
      }
    }
    if (!activeMemberIds.has(paidById)) {
      return res.status(400).json({ error: `Payer ${paidById} is not an active member of this group` });
    }

    // 3. Calculate splits based on splitMethod
    const totalAmount = Number(amount);
    let calculatedParticipants: { userId: string; amountOwed: number; shareValue?: number }[] = [];

    if (splitMethod === 'EQUAL') {
      const count = participants.length;
      const share = totalAmount / count;
      calculatedParticipants = participants.map((p: any) => ({
        userId: p.userId,
        amountOwed: share,
        shareValue: undefined
      }));
    } else if (splitMethod === 'UNEQUAL') {
      let sum = 0;
      participants.forEach((p: any) => {
        sum += Number(p.shareValue || 0);
      });
      if (Math.abs(sum - totalAmount) > 0.01) {
        return res.status(400).json({ error: `Sum of unequal splits ($${sum}) must equal total amount ($${totalAmount})` });
      }
      calculatedParticipants = participants.map((p: any) => ({
        userId: p.userId,
        amountOwed: Number(p.shareValue || 0),
        shareValue: Number(p.shareValue || 0)
      }));
    } else if (splitMethod === 'PERCENTAGE') {
      let sum = 0;
      participants.forEach((p: any) => {
        sum += Number(p.shareValue || 0);
      });
      if (Math.abs(sum - 100) > 0.01) {
        return res.status(400).json({ error: `Sum of percentages (${sum}%) must equal 100%` });
      }
      calculatedParticipants = participants.map((p: any) => ({
        userId: p.userId,
        amountOwed: (Number(p.shareValue || 0) / 100) * totalAmount,
        shareValue: Number(p.shareValue || 0)
      }));
    } else if (splitMethod === 'SHARE') {
      let totalShares = 0;
      participants.forEach((p: any) => {
        totalShares += Number(p.shareValue || 0);
      });
      if (totalShares <= 0) {
        return res.status(400).json({ error: 'Total shares must be greater than 0' });
      }
      calculatedParticipants = participants.map((p: any) => ({
        userId: p.userId,
        amountOwed: (Number(p.shareValue || 0) / totalShares) * totalAmount,
        shareValue: Number(p.shareValue || 0)
      }));
    }

    // 4. Floor each participant's share to cents and calculate rounding remainder
    let sumFloored = 0;
    const finalSplits = calculatedParticipants.map((p) => {
      // Floor to 2 decimal places
      const floored = Math.floor(p.amountOwed * 100) / 100;
      sumFloored += floored;
      return {
        userId: p.userId,
        amountOwed: floored,
        shareValue: p.shareValue
      };
    });

    const remainder = Number((totalAmount - sumFloored).toFixed(2));

    // 5. Add remainder to the payer's share
    const payerSplit = finalSplits.find(s => s.userId === paidById);
    if (payerSplit) {
      payerSplit.amountOwed = Number((payerSplit.amountOwed + remainder).toFixed(2));
    } else {
      // If payer is not participating, insert them with the remainder if it's non-zero
      if (remainder > 0.005) {
        finalSplits.push({
          userId: paidById,
          amountOwed: remainder,
          shareValue: undefined
        });
      }
    }

    // 6. Create the expense in the database transactionally
    const createdExpense = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          groupId,
          description,
          amount: totalAmount,
          date: new Date(date),
          paidById,
          createdById: currentUserId,
          splitMethod
        }
      });

      // Insert splits
      await tx.expenseParticipant.createMany({
        data: finalSplits.map(s => ({
          expenseId: exp.id,
          userId: s.userId,
          amountOwed: s.amountOwed,
          shareValue: s.shareValue
        }))
      });

      // Create immediate settlements if requested
      if (immediateSettlement) {
        for (const split of finalSplits) {
          // A participant is paying back the payer
          if (split.userId !== paidById && split.amountOwed > 0) {
            await tx.settlement.create({
              data: {
                groupId,
                payerId: split.userId,
                payeeId: paidById,
                amount: split.amountOwed,
                paymentMethod: paymentMethod || 'CASH',
                note: `Immediate payment for: ${description}`
              }
            });
          }
        }
      }

      return exp;
    });

    // Fetch complete details of the created expense
    const completeExpense = await prisma.expense.findUnique({
      where: { id: createdExpense.id },
      include: {
        paidBy: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    return res.status(201).json({
      data: completeExpense,
      message: 'Expense created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists expenses for a group, optionally paginated (defaults to 20/page).
 */
export const listExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?.userId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });
    if (!membership || !membership.isActive) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this group' });
    }

    const totalCount = await prisma.expense.count({
      where: { groupId, deletedAt: null }
    });

    const expenses = await prisma.expense.findMany({
      where: { groupId, deletedAt: null },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
      include: {
        paidBy: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    return res.status(200).json({
      data: expenses,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets a single expense's detailed splits and information.
 */
export const getExpenseDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        paidBy: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    if (!expense || expense.deletedAt) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Verify user membership in the expense's group
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: expense.groupId, userId } }
    });
    if (!membership || !membership.isActive) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this group' });
    }

    return res.status(200).json({
      data: expense
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Edits an expense (replaces splits fully). Restricted to creator or group admin.
 */
export const editExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { description, amount, date, paidById, splitMethod, participants } = req.body;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const expense = await prisma.expense.findUnique({
      where: { id }
    });

    if (!expense || expense.deletedAt) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Check membership and admin status
    const groupMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: expense.groupId, userId: currentUserId } }
    });

    if (!groupMembership || !groupMembership.isActive) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this group' });
    }

    const isCreator = expense.createdById === currentUserId;
    const isAdmin = groupMembership.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Only the creator or the group admin can edit this expense' });
    }

    // Validate participants exist in group
    const participantIds = participants.map((p: any) => p.userId);
    const memberRecords = await prisma.groupMember.findMany({
      where: {
        groupId: expense.groupId,
        userId: { in: [...participantIds, paidById] },
        isActive: true
      }
    });

    const activeMemberIds = new Set(memberRecords.map(m => m.userId));
    for (const id of participantIds) {
      if (!activeMemberIds.has(id)) {
        return res.status(400).json({ error: `User ${id} is not an active member of this group` });
      }
    }
    if (!activeMemberIds.has(paidById)) {
      return res.status(400).json({ error: `Payer ${paidById} is not an active member of this group` });
    }

    // Recalculate splits
    const totalAmount = Number(amount);
    let calculatedParticipants: { userId: string; amountOwed: number; shareValue?: number }[] = [];

    if (splitMethod === 'EQUAL') {
      const count = participants.length;
      const share = totalAmount / count;
      calculatedParticipants = participants.map((p: any) => ({
        userId: p.userId,
        amountOwed: share,
        shareValue: undefined
      }));
    } else if (splitMethod === 'UNEQUAL') {
      let sum = 0;
      participants.forEach((p: any) => {
        sum += Number(p.shareValue || 0);
      });
      if (Math.abs(sum - totalAmount) > 0.01) {
        return res.status(400).json({ error: `Sum of unequal splits ($${sum}) must equal total amount ($${totalAmount})` });
      }
      calculatedParticipants = participants.map((p: any) => ({
        userId: p.userId,
        amountOwed: Number(p.shareValue || 0),
        shareValue: Number(p.shareValue || 0)
      }));
    } else if (splitMethod === 'PERCENTAGE') {
      let sum = 0;
      participants.forEach((p: any) => {
        sum += Number(p.shareValue || 0);
      });
      if (Math.abs(sum - 100) > 0.01) {
        return res.status(400).json({ error: `Sum of percentages (${sum}%) must equal 100%` });
      }
      calculatedParticipants = participants.map((p: any) => ({
        userId: p.userId,
        amountOwed: (Number(p.shareValue || 0) / 100) * totalAmount,
        shareValue: Number(p.shareValue || 0)
      }));
    } else if (splitMethod === 'SHARE') {
      let totalShares = 0;
      participants.forEach((p: any) => {
        totalShares += Number(p.shareValue || 0);
      });
      if (totalShares <= 0) {
        return res.status(400).json({ error: 'Total shares must be greater than 0' });
      }
      calculatedParticipants = participants.map((p: any) => ({
        userId: p.userId,
        amountOwed: (Number(p.shareValue || 0) / totalShares) * totalAmount,
        shareValue: Number(p.shareValue || 0)
      }));
    }

    // Floor and handle rounding remainder
    let sumFloored = 0;
    const finalSplits = calculatedParticipants.map((p) => {
      const floored = Math.floor(p.amountOwed * 100) / 100;
      sumFloored += floored;
      return {
        userId: p.userId,
        amountOwed: floored,
        shareValue: p.shareValue
      };
    });

    const remainder = Number((totalAmount - sumFloored).toFixed(2));

    const payerSplit = finalSplits.find(s => s.userId === paidById);
    if (payerSplit) {
      payerSplit.amountOwed = Number((payerSplit.amountOwed + remainder).toFixed(2));
    } else {
      if (remainder > 0.005) {
        finalSplits.push({
          userId: paidById,
          amountOwed: remainder,
          shareValue: undefined
        });
      }
    }

    // Edit the expense in transaction
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update expense details
      const exp = await tx.expense.update({
        where: { id },
        data: {
          description,
          amount: totalAmount,
          date: new Date(date),
          paidById,
          splitMethod
        }
      });

      // 2. Delete all existing splits
      await tx.expenseParticipant.deleteMany({
        where: { expenseId: id }
      });

      // 3. Create new splits
      await tx.expenseParticipant.createMany({
        data: finalSplits.map(s => ({
          expenseId: id,
          userId: s.userId,
          amountOwed: s.amountOwed,
          shareValue: s.shareValue
        }))
      });

      return exp;
    });

    const completeExpense = await prisma.expense.findUnique({
      where: { id: updated.id },
      include: {
        paidBy: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    return res.status(200).json({
      data: completeExpense,
      message: 'Expense updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft deletes an expense. Only creator or group admin.
 */
export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const expense = await prisma.expense.findUnique({
      where: { id }
    });

    if (!expense || expense.deletedAt) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const groupMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: expense.groupId, userId: currentUserId } }
    });

    if (!groupMembership || !groupMembership.isActive) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this group' });
    }

    const isCreator = expense.createdById === currentUserId;
    const isAdmin = groupMembership.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Only the creator or the group admin can delete this expense' });
    }

    // Soft delete
    await prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return res.status(200).json({
      data: { id },
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
