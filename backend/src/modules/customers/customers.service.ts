import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { AppError } from '../../errors/AppError';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerFollowUpInput,
  ListCustomersQuery,
} from './customers.schema';

export class CustomersService {
  static async createCustomer(data: CreateCustomerInput) {
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        mobile: data.mobile,
        email: data.email.toLowerCase(),
        businessName: data.businessName,
        gstNumber: data.gstNumber || null,
        customerType: data.customerType,
        address: data.address,
        status: data.status,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        notes: data.notes || null,
      },
    });

    return customer;
  }

  static async updateCustomer(id: string, data: UpdateCustomerInput) {
    const existing = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound(`Customer with ID "${id}" not found`);
    }

    const updateData: Prisma.CustomerUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.mobile !== undefined) updateData.mobile = data.mobile;
    if (data.email !== undefined) updateData.email = data.email.toLowerCase();
    if (data.businessName !== undefined) updateData.businessName = data.businessName;
    if (data.gstNumber !== undefined) updateData.gstNumber = data.gstNumber;
    if (data.customerType !== undefined) updateData.customerType = data.customerType;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.followUpDate !== undefined) {
      updateData.followUpDate = data.followUpDate ? new Date(data.followUpDate) : null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes;

    return await prisma.customer.update({
      where: { id },
      data: updateData,
    });
  }

  static async addFollowUp(id: string, data: CustomerFollowUpInput, userName: string) {
    const existing = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound(`Customer with ID "${id}" not found`);
    }

    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC' });
    const formattedNote = `\n[${timestamp} by ${userName}]: ${data.notes}`;
    const updatedNotes = existing.notes ? `${existing.notes}${formattedNote}` : formattedNote.trim();

    return await prisma.customer.update({
      where: { id },
      data: {
        notes: updatedNotes,
        ...(data.followUpDate !== undefined
          ? { followUpDate: data.followUpDate ? new Date(data.followUpDate) : null }
          : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    });
  }

  static async listCustomers(query: ListCustomersQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.customerType) {
      where.customerType = query.customerType;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { businessName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { mobile: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        challans: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            challanNumber: true,
            status: true,
            totalQuantity: true,
            createdAt: true,
          },
        },
      },
    });

    if (!customer) {
      throw AppError.notFound(`Customer with ID "${id}" not found`);
    }

    return customer;
  }
}
