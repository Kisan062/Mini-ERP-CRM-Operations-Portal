import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { UserRole } from '../types';

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access denied. Requires one of the following roles: [${roles.join(', ')}]. Your role is: ${req.user.role}`
        )
      );
    }

    next();
  };
};
