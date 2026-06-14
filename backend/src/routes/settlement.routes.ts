import { Router } from 'express';
import {
  createSettlement,
  listSettlements,
  deleteSettlement
} from '../controllers/settlement.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest.middleware';
import { createSettlementSchema } from '../validators/settlement.validators';

const router = Router();

// Secure all routes
router.use(authenticate);

router.post('/groups/:groupId/settlements', validateRequest(createSettlementSchema), createSettlement);
router.get('/groups/:groupId/settlements', listSettlements);
router.delete('/settlements/:id', deleteSettlement);

export default router;
