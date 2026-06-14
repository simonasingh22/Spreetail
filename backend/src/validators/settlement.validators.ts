import { z } from 'zod';

export const createSettlementSchema = z.object({
  payeeId: z.string().uuid(),
  amount: z.number().positive().max(999999.99),
  note: z.string().max(200).optional().nullable(),
  paymentMethod: z.string().max(50).optional().nullable()
});
