import { Router } from 'express';
import {
  createExpense,
  listExpenses,
  getExpenseDetail,
  editExpense,
  deleteExpense
} from '../controllers/expense.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest.middleware';
import {
  createExpenseSchema,
  editExpenseSchema
} from '../validators/expense.validators';

const router = Router();

// Secure all routes
router.use(authenticate);

router.post('/groups/:groupId/expenses', validateRequest(createExpenseSchema), createExpense);
router.get('/groups/:groupId/expenses', listExpenses);

router.get('/expenses/:id', getExpenseDetail);
router.put('/expenses/:id', validateRequest(editExpenseSchema), editExpense);
router.delete('/expenses/:id', deleteExpense);

export default router;
