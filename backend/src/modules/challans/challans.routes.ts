import { Router } from 'express';
import { ChallansController } from './challans.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { authorizeRoles } from '../../middleware/rbac';
import {
  createChallanSchema,
  updateChallanSchema,
  listChallansQuerySchema,
} from './challans.schema';

const router = Router();

// All challan routes require authentication
router.use(authenticate);

// Read endpoints
router.get('/', validate(listChallansQuerySchema), ChallansController.listChallans);
router.get('/:id', ChallansController.getChallanById);

// Create draft challan
router.post(
  '/',
  authorizeRoles('ADMIN', 'SALES', 'WAREHOUSE'),
  validate(createChallanSchema),
  ChallansController.createChallan
);

// Edit draft challan
router.put(
  '/:id',
  authorizeRoles('ADMIN', 'SALES', 'WAREHOUSE'),
  validate(updateChallanSchema),
  ChallansController.updateChallan
);

// Confirm challan (stock decrement transaction)
router.patch(
  '/:id/confirm',
  authorizeRoles('ADMIN', 'SALES', 'WAREHOUSE'),
  ChallansController.confirmChallan
);

// Cancel challan (with stock reversal if confirmed)
router.patch(
  '/:id/cancel',
  authorizeRoles('ADMIN', 'SALES', 'WAREHOUSE'),
  ChallansController.cancelChallan
);

export default router;
