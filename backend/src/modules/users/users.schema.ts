import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100),
    role: z.enum(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'], {
      errorMap: () => ({ message: 'Role must be ADMIN, SALES, WAREHOUSE, or ACCOUNTS' }),
    }),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
    email: z.string().trim().toLowerCase().email('Invalid email address').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100).optional(),
    role: z.enum(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'], {
      errorMap: () => ({ message: 'Role must be ADMIN, SALES, WAREHOUSE, or ACCOUNTS' }),
    }).optional(),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
