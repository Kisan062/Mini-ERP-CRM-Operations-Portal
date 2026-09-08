import { z } from 'zod';

const challanItemInputSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

export const createChallanSchema = z.object({
  body: z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    items: z
      .array(challanItemInputSchema)
      .min(1, 'At least one line item is required in a challan'),
  }),
});

export const updateChallanSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Challan ID is required'),
  }),
  body: z.object({
    customerId: z.string().min(1).optional(),
    items: z.array(challanItemInputSchema).min(1).optional(),
  }),
});

export const listChallansQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
    status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
    search: z.string().optional(),
    customerId: z.string().optional(),
  }),
});

export type CreateChallanInput = z.infer<typeof createChallanSchema>['body'];
export type UpdateChallanInput = z.infer<typeof updateChallanSchema>['body'];
export type ListChallansQuery = z.infer<typeof listChallansQuerySchema>['query'];
