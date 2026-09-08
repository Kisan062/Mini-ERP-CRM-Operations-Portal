import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Product name is required'),
    sku: z.string().min(1, 'SKU is required').transform((s) => s.trim().toUpperCase()),
    category: z.string().min(1, 'Category is required'),
    unitPrice: z.number().positive('Unit price must be greater than zero'),
    initialStock: z.number().int().nonnegative('Initial stock must be >= 0').default(0),
    minStockAlert: z.number().int().nonnegative('Min stock alert must be >= 0').default(0),
    location: z.string().optional().nullable(),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Product ID is required'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    unitPrice: z.number().positive('Unit price must be greater than zero').optional(),
    minStockAlert: z.number().int().nonnegative('Min stock alert must be >= 0').optional(),
    location: z.string().optional().nullable(),
    // Strictly forbid currentStock from being modified directly
  }).strict(),
});

export const stockAdjustmentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Product ID is required'),
  }),
  body: z.object({
    quantity: z.number().int().positive('Quantity must be a positive integer'),
    movementType: z.enum(['IN', 'OUT']),
    reason: z.string().min(2, 'A reason for stock movement is required'),
  }),
});

export const listProductsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
    search: z.string().optional(),
    category: z.string().optional(),
    lowStockOnly: z.string().optional().transform((v) => v === 'true'),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>['body'];
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>['query'];
