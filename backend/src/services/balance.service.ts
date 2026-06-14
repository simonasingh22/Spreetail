import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SimplifiedDebt {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

interface RawDebt {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

/**
 * Calculates simplified and raw balances for a group dynamically.
 */
export const calculateSimplifiedBalances = async (groupId: string) => {
  // 1. Fetch group members
  const members = await prisma.groupMember.findMany({
    where: { groupId, isActive: true },
    include: { user: true }
  });

  const memberMap = new Map<string, string>();
  const netBalances: Record<string, number> = {};

  members.forEach((m) => {
    memberMap.set(m.userId, m.user.name);
    netBalances[m.userId] = 0;
  });

  // 2. Fetch all active (non-deleted) expenses + participant splits
  const expenses = await prisma.expense.findMany({
    where: { groupId, deletedAt: null },
    include: {
      participants: true
    }
  });

  // 3. Fetch all settlements
  const settlements = await prisma.settlement.findMany({
    where: { groupId }
  });

  // --- NET BALANCE COMPUTATION ---
  // Expenses logic: Payer gets credit (positive), participants get debit (negative)
  expenses.forEach((expense) => {
    const payerId = expense.paidById;
    const totalAmount = Number(expense.amount);

    if (netBalances[payerId] !== undefined) {
      netBalances[payerId] += totalAmount;
    }

    expense.participants.forEach((part) => {
      const owed = Number(part.amountOwed);
      if (netBalances[part.userId] !== undefined) {
        netBalances[part.userId] -= owed;
      }
    });
  });

  // Settlements logic: Payer gets credit (positive), Payee gets debit (negative)
  settlements.forEach((settlement) => {
    const payerId = settlement.payerId;
    const payeeId = settlement.payeeId;
    const amount = Number(settlement.amount);

    if (netBalances[payerId] !== undefined) {
      netBalances[payerId] += amount;
    }
    if (netBalances[payeeId] !== undefined) {
      netBalances[payeeId] -= amount;
    }
  });

  // --- RAW DEBT COMPUTATION ---
  // Track pairwise debt: pairwise[A][B] = how much A owes B
  const pairwiseDebt: Record<string, Record<string, number>> = {};
  members.forEach((m1) => {
    pairwiseDebt[m1.userId] = {};
    members.forEach((m2) => {
      pairwiseDebt[m1.userId][m2.userId] = 0;
    });
  });

  // Add raw expense shares: participant owes payer
  expenses.forEach((expense) => {
    const payerId = expense.paidById;
    expense.participants.forEach((part) => {
      if (part.userId !== payerId) {
        if (pairwiseDebt[part.userId] && pairwiseDebt[part.userId][payerId] !== undefined) {
          pairwiseDebt[part.userId][payerId] += Number(part.amountOwed);
        }
      }
    });
  });

  // Add raw settlements: payer settled payee, so payee "owes" payer negative amount (reduces what payer owed payee)
  settlements.forEach((settlement) => {
    const payerId = settlement.payerId;
    const payeeId = settlement.payeeId;
    const amount = Number(settlement.amount);

    if (pairwiseDebt[payerId] && pairwiseDebt[payerId][payeeId] !== undefined) {
      pairwiseDebt[payerId][payeeId] -= amount;
    }
  });

  // Build net raw debts array
  const rawDebts: RawDebt[] = [];
  const userIds = Array.from(memberMap.keys());

  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      const u1 = userIds[i];
      const u2 = userIds[j];

      const u1OwesU2 = pairwiseDebt[u1][u2] || 0;
      const u2OwesU1 = pairwiseDebt[u2][u1] || 0;

      const diff = u1OwesU2 - u2OwesU1;
      if (Math.abs(diff) > 0.005) {
        if (diff > 0) {
          rawDebts.push({
            fromId: u1,
            fromName: memberMap.get(u1) || u1,
            toId: u2,
            toName: memberMap.get(u2) || u2,
            amount: Number(diff.toFixed(2))
          });
        } else {
          rawDebts.push({
            fromId: u2,
            fromName: memberMap.get(u2) || u2,
            toId: u1,
            toName: memberMap.get(u1) || u1,
            amount: Number(Math.abs(diff).toFixed(2))
          });
        }
      }
    }
  }

  // --- GREEDY DEBT SIMPLIFICATION ---
  const debtors: { id: string; balance: number }[] = [];
  const creditors: { id: string; balance: number }[] = [];

  Object.entries(netBalances).forEach(([userId, balance]) => {
    const rounded = Number(balance.toFixed(2));
    if (rounded < -0.005) {
      debtors.push({ id: userId, balance: rounded });
    } else if (rounded > 0.005) {
      creditors.push({ id: userId, balance: rounded });
    }
  });

  const simplified: SimplifiedDebt[] = [];

  // Sort: Debtors ascending (most negative first), Creditors descending (most positive first)
  debtors.sort((a, b) => a.balance - b.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  let dIndex = 0;
  let cIndex = 0;

  while (dIndex < debtors.length && cIndex < creditors.length) {
    const debtor = debtors[dIndex];
    const creditor = creditors[cIndex];

    const debtAmount = Math.min(Math.abs(debtor.balance), creditor.balance);
    const amount = Number(debtAmount.toFixed(2));

    if (amount > 0.005) {
      simplified.push({
        fromId: debtor.id,
        fromName: memberMap.get(debtor.id) || debtor.id,
        toId: creditor.id,
        toName: memberMap.get(creditor.id) || creditor.id,
        amount
      });
    }

    debtor.balance += amount;
    creditor.balance -= amount;

    if (Math.abs(debtor.balance) < 0.005) {
      dIndex++;
    }
    if (Math.abs(creditor.balance) < 0.005) {
      cIndex++;
    }
  }

  // Format netBalances to standard numbers for response
  const individualSummary: Record<string, number> = {};
  Object.entries(netBalances).forEach(([userId, val]) => {
    individualSummary[userId] = Number(val.toFixed(2));
  });

  return {
    simplified,
    raw: rawDebts,
    individualSummary
  };
};

/**
 * Calculates a global summary for a user across all active groups.
 */
export const getIndividualSummary = async (userId: string) => {
  // Find all groups where the user is an active member
  const memberships = await prisma.groupMember.findMany({
    where: { userId, isActive: true },
    select: { groupId: true }
  });

  let totalOwed = 0; // money others owe to the user (positive balances)
  let totalOwedTo = 0; // money the user owes to others (negative balances)

  for (const membership of memberships) {
    const balances = await calculateSimplifiedBalances(membership.groupId);
    const userNet = balances.individualSummary[userId] || 0;
    
    if (userNet > 0) {
      totalOwed += userNet;
    } else if (userNet < 0) {
      totalOwedTo += Math.abs(userNet);
    }
  }

  return {
    totalOwed: Number(totalOwed.toFixed(2)),
    totalOwedTo: Number(totalOwedTo.toFixed(2)),
    netBalance: Number((totalOwed - totalOwedTo).toFixed(2))
  };
};
