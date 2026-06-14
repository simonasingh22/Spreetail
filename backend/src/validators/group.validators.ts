import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100)
});

export const renameGroupSchema = z.object({
  name: z.string().min(1).max(100)
});

export const addMemberSchema = z.object({
  email: z.string().email()
});
