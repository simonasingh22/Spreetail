import { Router } from 'express';
import { getMessages, deleteMessage } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Retrieve message history for an expense (last 50 messages)
router.get('/expenses/:id/messages', authenticate, getMessages);

// Soft delete a message (only sender)
router.delete('/messages/:id', authenticate, deleteMessage);

export default router;
