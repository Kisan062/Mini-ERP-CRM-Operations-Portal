import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { authorizeRoles } from '../../middleware/rbac';
import { loginSchema, registerSchema } from './auth.schema';
import prisma from '../../config/prisma';
import { AppError } from '../../errors/AppError';

const router = Router();

// Middleware allowing initial admin setup if no users exist, otherwise requiring ADMIN role
const allowFirstUserOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      // Allow bootstrap first user (forces role ADMIN if bootstrap)
      return next();
    }
    // If users exist, must be authenticated ADMIN
    return authenticate(req, res, () => {
      authorizeRoles('ADMIN')(req, res, next);
    });
  } catch (error) {
    next(error);
  }
};

router.post('/register', allowFirstUserOrAdmin, validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.get('/me', authenticate, AuthController.getMe);

export default router;
