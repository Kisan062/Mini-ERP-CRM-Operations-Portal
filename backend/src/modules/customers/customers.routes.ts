import { Router } from 'express';
import { CustomersController } from './customers.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { authorizeRoles } from '../../middleware/rbac';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerFollowUpSchema,
  listCustomersQuerySchema,
} from './customers.schema';

const router = Router();

// All customer routes require authentication
router.use(authenticate);

// Read endpoints
router.get('/', validate(listCustomersQuerySchema), CustomersController.listCustomers);
router.get('/:id', CustomersController.getCustomerById);

// Customer management restricted to ADMIN and SALES
router.post(
  '/',
  authorizeRoles('ADMIN', 'SALES'),
  validate(createCustomerSchema),
  CustomersController.createCustomer
);

router.put(
  '/:id',
  authorizeRoles('ADMIN', 'SALES'),
  validate(updateCustomerSchema),
  CustomersController.updateCustomer
);

router.post(
  '/:id/followups',
  authorizeRoles('ADMIN', 'SALES'),
  validate(customerFollowUpSchema),
  CustomersController.addFollowUp
);

export default router;
