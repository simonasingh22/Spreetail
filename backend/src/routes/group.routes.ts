import { Router } from 'express';
import {
  createGroup,
  listGroups,
  getGroupDetail,
  renameGroup,
  deleteGroup,
  addMember,
  removeMember,
  getGroupBalances,
  getUserGlobalSummary
} from '../controllers/group.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest.middleware';
import {
  createGroupSchema,
  renameGroupSchema,
  addMemberSchema
} from '../validators/group.validators';

const router = Router();

// Secure all group routes with authentication
router.use(authenticate);

router.get('/balances/summary', getUserGlobalSummary);

router.post('/', validateRequest(createGroupSchema), createGroup);
router.get('/', listGroups);
router.get('/:id', getGroupDetail);
router.put('/:id', validateRequest(renameGroupSchema), renameGroup);
router.delete('/:id', deleteGroup);

router.post('/:id/members', validateRequest(addMemberSchema), addMember);
router.delete('/:id/members/:userId', removeMember);

router.get('/:groupId/balances', getGroupBalances);

export default router;
