import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { calculateSimplifiedBalances } from '../services/balance.service';

const prisma = new PrismaClient();

/**
 * Creates a new group. The creator is added as ADMIN.
 */
export const createGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const group = await prisma.group.create({
      data: {
        name,
        members: {
          create: {
            userId: userId,
            role: 'ADMIN',
            isActive: true
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    return res.status(201).json({
      data: group,
      message: 'Group created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists all active groups for the logged-in user.
 */
export const listGroups = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find active group memberships
    const memberships = await prisma.groupMember.findMany({
      where: { userId, isActive: true },
      include: {
        group: {
          include: {
            members: {
              where: { isActive: true },
              select: { id: true }
            }
          }
        }
      }
    });

    const groups = memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      role: m.role,
      joinedAt: m.joinedAt,
      memberCount: m.group.members.length
    }));

    return res.status(200).json({
      data: groups
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets group detail. Verifies user membership.
 */
export const getGroupDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId: userId
        }
      }
    });

    if (!membership || !membership.isActive) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this group' });
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    return res.status(200).json({
      data: group
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Renames the group. Restricted to admin.
 */
export const renameGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } }
    });

    if (!membership || !membership.isActive || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can rename the group' });
    }

    const updatedGroup = await prisma.group.update({
      where: { id },
      data: { name }
    });

    return res.status(200).json({
      data: updatedGroup,
      message: 'Group renamed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes group (hard delete, cascades to splits, messages, settlements). Admin only.
 */
export const deleteGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } }
    });

    if (!membership || !membership.isActive || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can delete the group' });
    }

    await prisma.group.delete({
      where: { id }
    });

    return res.status(200).json({
      data: { id },
      message: 'Group deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Adds a member to the group by email. Email must exist. Any member can invite.
 */
export const addMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify current user is a member
    const inviterMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } }
    });

    if (!inviterMembership || !inviterMembership.isActive) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this group' });
    }

    // Verify invited email exists
    const invitee = await prisma.user.findUnique({
      where: { email }
    });

    if (!invitee) {
      return res.status(404).json({ error: 'No user found with this email. Ask them to register first.' });
    }

    // Check if user is already a member
    const existingMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: invitee.id } }
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        return res.status(400).json({ error: 'User is already a member of this group' });
      }
      
      // Reactivate soft-removed member
      const reactivated = await prisma.groupMember.update({
        where: { id: existingMembership.id },
        data: { isActive: true, role: 'MEMBER' },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      });
      return res.status(200).json({
        data: reactivated,
        message: 'Member reactivated in group successfully'
      });
    }

    // Create new group member
    const newMember = await prisma.groupMember.create({
      data: {
        groupId: id,
        userId: invitee.id,
        role: 'MEMBER',
        isActive: true
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    return res.status(201).json({
      data: newMember,
      message: 'Member added to group successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Removes a member (admin only) or allows voluntary leave (self).
 * Must have net balance === 0.00.
 */
export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: groupId, userId: targetUserId } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch memberships
    const currentUserMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: currentUserId } }
    });

    const targetUserMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } }
    });

    if (!currentUserMembership || !currentUserMembership.isActive) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this group' });
    }

    if (!targetUserMembership || !targetUserMembership.isActive) {
      return res.status(404).json({ error: 'Member not found in this group' });
    }

    const isSelfRemove = currentUserId === targetUserId;
    const isAdmin = currentUserMembership.role === 'ADMIN';

    // Permission check: only admin can remove others; user can remove self
    if (!isSelfRemove && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Only administrators can remove other members' });
    }

    // Hard rule: balance must be exactly 0
    const balances = await calculateSimplifiedBalances(groupId);
    const targetNetBalance = balances.individualSummary[targetUserId] || 0;

    if (Math.abs(targetNetBalance) > 0.005) {
      return res.status(400).json({ error: 'Settle all debts before leaving the group.' });
    }

    // Soft remove (isActive = false, demote if admin to prevent orphaned admin scenarios)
    const removedMember = await prisma.groupMember.update({
      where: { id: targetUserMembership.id },
      data: {
        isActive: false,
        role: 'MEMBER'
      }
    });

    return res.status(200).json({
      data: { userId: targetUserId },
      message: isSelfRemove ? 'You have left the group successfully' : 'Member removed from group successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets group balances.
 */
export const getGroupBalances = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!membership || !membership.isActive) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this group' });
    }

    const balances = await calculateSimplifiedBalances(groupId);

    return res.status(200).json({
      data: balances
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets the global summary of money owed/owes across all groups for the logged-in user.
 */
export const getUserGlobalSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { getIndividualSummary } = require('../services/balance.service');
    const summary = await getIndividualSummary(userId);

    return res.status(200).json({
      data: summary
    });
  } catch (error) {
    next(error);
  }
};
