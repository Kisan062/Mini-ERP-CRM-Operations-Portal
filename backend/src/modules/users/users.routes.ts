import { Router } from 'express';
import { UsersController } from './users.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { authorizeRoles } from '../../middleware/rbac';
import { createUserSchema, updateUserSchema } from './users.schema';

const router = Router();

// All user management routes require an authenticated ADMIN
router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/', UsersController.listUsers);
router.post('/', validate(createUserSchema), UsersController.createUser);
router.get('/:id', UsersController.getUserById);
router.put('/:id', validate(updateUserSchema), UsersController.updateUser);
router.delete('/:id', UsersController.deleteUser);

export default router;
