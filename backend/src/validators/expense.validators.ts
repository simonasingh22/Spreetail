import { z } from 'zod';

export const createExpenseSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive().max(999999.99),
  date: z.string().datetime().or(z.date()).or(z.string()),
  paidById: z.string().uuid(),
  splitMethod: z.enum(['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARE']),
  participants: z.array(
    z.object({
      userId: z.string().uuid(),
      shareValue: z.number().nonnegative().optional().nullable()
    })
  ).min(1),
  immediateSettlement: z.boolean().optional(),
  paymentMethod: z.string().max(50).optional().nullable()
});

export const editExpenseSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive().max(999999.99),
  date: z.string().datetime().or(z.date()).or(z.string()),
  paidById: z.string().uuid(),
  splitMethod: z.enum(['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARE']),
  participants: z.array(
    z.object({
      userId: z.string().uuid(),
      shareValue: z.number().nonnegative().optional().nullable()
    })
  ).min(1),
  immediateSettlement: z.boolean().optional(),
  paymentMethod: z.string().max(50).optional().nullable()
});
