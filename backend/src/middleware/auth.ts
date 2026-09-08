import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { AppError } from '../errors/AppError';
import prisma from '../config/prisma';
import { AuthUser, UserRole } from '../types';

interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('No authentication token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw AppError.unauthorized('Invalid authorization header format');
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw AppError.unauthorized('Authentication token has expired');
      }
      throw AppError.unauthorized('Invalid authentication token');
    }

    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      throw AppError.unauthorized('User associated with this token no longer exists');
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
    };

    next();
  } catch (error) {
    next(error);
  }
};
