import { Router } from 'express';
import { ProductsController } from './products.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { authorizeRoles } from '../../middleware/rbac';
import {
  createProductSchema,
  updateProductSchema,
  stockAdjustmentSchema,
  listProductsQuerySchema,
} from './products.schema';

const router = Router();

// All product routes require authentication
router.use(authenticate);

// Read endpoints accessible by all roles
router.get('/', validate(listProductsQuerySchema), ProductsController.listProducts);
router.get('/:id', ProductsController.getProductById);
router.get('/:id/logs', ProductsController.getProductLogs);

// Management endpoints restricted to ADMIN and WAREHOUSE
router.post(
  '/',
  authorizeRoles('ADMIN', 'WAREHOUSE'),
  validate(createProductSchema),
  ProductsController.createProduct
);

router.put(
  '/:id',
  authorizeRoles('ADMIN', 'WAREHOUSE'),
  validate(updateProductSchema),
  ProductsController.updateProduct
);

router.post(
  '/:id/stock',
  authorizeRoles('ADMIN', 'WAREHOUSE'),
  validate(stockAdjustmentSchema),
  ProductsController.adjustStock
);

export default router;
