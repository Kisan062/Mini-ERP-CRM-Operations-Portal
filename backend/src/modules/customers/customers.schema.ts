import { z } from 'zod';

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Contact person name is required'),
    mobile: z.string().min(5, 'Mobile number is required'),
    email: z.string().email('Invalid email address'),
    businessName: z.string().min(2, 'Business name is required'),
    gstNumber: z.string().optional().nullable(),
    customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']),
    address: z.string().min(3, 'Address is required'),
    status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).default('LEAD'),
    followUpDate: z.string().datetime().optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});

export const updateCustomerSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Customer ID is required'),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    mobile: z.string().min(5).optional(),
    email: z.string().email().optional(),
    businessName: z.string().min(2).optional(),
    gstNumber: z.string().optional().nullable(),
    customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']).optional(),
    address: z.string().min(3).optional(),
    status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).optional(),
    followUpDate: z.string().datetime().optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});

export const customerFollowUpSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Customer ID is required'),
  }),
  body: z.object({
    followUpDate: z.string().datetime().optional().nullable(),
    notes: z.string().min(1, 'Follow up notes are required'),
    status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const listCustomersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
    search: z.string().optional(),
    customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']).optional(),
    status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).optional(),
  }),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>['body'];
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>['body'];
export type CustomerFollowUpInput = z.infer<typeof customerFollowUpSchema>['body'];
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>['query'];
