import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { AppError } from '../../errors/AppError';
import { generateChallanNumber } from '../../utils/challanNumber';
import {
  CreateChallanInput,
  UpdateChallanInput,
  ListChallansQuery,
} from './challans.schema';

export class ChallansService {
  static async createChallan(data: CreateChallanInput, userId: string) {
    // 1. Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw AppError.notFound(`Customer with ID "${data.customerId}" not found`);
    }

    // 2. Aggregate quantities for duplicate product lines in request
    const productQtyMap = new Map<string, number>();
    for (const item of data.items) {
      const current = productQtyMap.get(item.productId) || 0;
      productQtyMap.set(item.productId, current + item.quantity);
    }

    const productIds = Array.from(productQtyMap.keys());

    // 3. Fetch products to get snapshots
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map((p) => p.id));
      const missing = productIds.filter((id) => !foundIds.has(id));
      throw AppError.badRequest(`Invalid product IDs: ${missing.join(', ')}`);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 4. Calculate total quantity & build items with snapshots
    let totalQuantity = 0;
    const itemsToCreate = data.items.map((item) => {
      const prod = productMap.get(item.productId)!;
      totalQuantity += item.quantity;
      return {
        productId: prod.id,
        productNameSnapshot: prod.name,
        unitPriceSnapshot: prod.unitPrice,
        quantity: item.quantity,
      };
    });

    // 5. Create Challan in DRAFT status inside a transaction to generate sequential challan number safely
    return await prisma.$transaction(async (tx) => {
      const challanNumber = await generateChallanNumber(tx);

      const challan = await tx.challan.create({
        data: {
          challanNumber,
          customerId: data.customerId,
          status: 'DRAFT',
          totalQuantity,
          createdBy: userId,
          items: {
            create: itemsToCreate,
          },
        },
        include: {
          customer: true,
          createdByUser: {
            select: { id: true, name: true, email: true, role: true },
          },
          items: true,
        },
      });

      return challan;
    });
  }

  static async updateChallan(id: string, data: UpdateChallanInput) {
    const existing = await prisma.challan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      throw AppError.notFound(`Challan with ID "${id}" not found`);
    }

    if (existing.status !== 'DRAFT') {
      throw AppError.badRequest(
        `Cannot edit challan "${existing.challanNumber}" because it is already ${existing.status}. Only DRAFT challans can be edited.`
      );
    }

    if (data.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
      });
      if (!customer) {
        throw AppError.notFound(`Customer with ID "${data.customerId}" not found`);
      }
    }

    return await prisma.$transaction(async (tx) => {
      let totalQuantity = existing.totalQuantity;

      if (data.items) {
        const productQtyMap = new Map<string, number>();
        for (const item of data.items) {
          const current = productQtyMap.get(item.productId) || 0;
          productQtyMap.set(item.productId, current + item.quantity);
        }

        const productIds = Array.from(productQtyMap.keys());
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
        });

        if (products.length !== productIds.length) {
          const foundIds = new Set(products.map((p) => p.id));
          const missing = productIds.filter((id) => !foundIds.has(id));
          throw AppError.badRequest(`Invalid product IDs: ${missing.join(', ')}`);
        }

        const productMap = new Map(products.map((p) => [p.id, p]));

        // Delete existing items
        await tx.challanItem.deleteMany({
          where: { challanId: id },
        });

        totalQuantity = 0;
        const newItems = data.items.map((item) => {
          const prod = productMap.get(item.productId)!;
          totalQuantity += item.quantity;
          return {
            challanId: id,
            productId: prod.id,
            productNameSnapshot: prod.name,
            unitPriceSnapshot: prod.unitPrice,
            quantity: item.quantity,
          };
        });

        await tx.challanItem.createMany({
          data: newItems,
        });
      }

      const updatedChallan = await tx.challan.update({
        where: { id },
        data: {
          ...(data.customerId ? { customerId: data.customerId } : {}),
          totalQuantity,
        },
        include: {
          customer: true,
          createdByUser: {
            select: { id: true, name: true, email: true, role: true },
          },
          items: true,
        },
      });

      return updatedChallan;
    });
  }

  static async confirmChallan(id: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch Challan with line items
      const challan = await tx.challan.findUnique({
        where: { id },
        include: {
          items: true,
          customer: true,
        },
      });

      if (!challan) {
        throw AppError.notFound(`Challan with ID "${id}" not found`);
      }

      if (challan.status === 'CONFIRMED') {
        throw AppError.badRequest(`Challan "${challan.challanNumber}" is already CONFIRMED.`);
      }

      if (challan.status === 'CANCELLED') {
        throw AppError.badRequest(`Cannot confirm cancelled challan "${challan.challanNumber}".`);
      }

      if (challan.items.length === 0) {
        throw AppError.badRequest(`Challan "${challan.challanNumber}" has no line items.`);
      }

      // 2. Aggregate required quantity per product
      const requiredQtyByProduct = new Map<string, number>();
      for (const item of challan.items) {
        const cur = requiredQtyByProduct.get(item.productId) || 0;
        requiredQtyByProduct.set(item.productId, cur + item.quantity);
      }

      const productIds = Array.from(requiredQtyByProduct.keys());

      // 3. Row locking in PostgreSQL to prevent concurrent race conditions
      await tx.$queryRaw`
        SELECT id, "currentStock" 
        FROM "Product" 
        WHERE id IN (${Prisma.join(productIds)}) 
        FOR UPDATE
      `;

      // 4. Fetch the locked products
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      // 5. Verify stock availability for EVERY line item
      const shortages: {
        productId: string;
        productName: string;
        sku: string;
        available: number;
        requested: number;
        shortBy: number;
      }[] = [];

      for (const [productId, requiredQty] of requiredQtyByProduct.entries()) {
        const product = productMap.get(productId);

        if (!product) {
          shortages.push({
            productId,
            productName: 'Unknown Product',
            sku: 'UNKNOWN',
            available: 0,
            requested: requiredQty,
            shortBy: requiredQty,
          });
          continue;
        }

        if (product.currentStock < requiredQty) {
          shortages.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            available: product.currentStock,
            requested: requiredQty,
            shortBy: requiredQty - product.currentStock,
          });
        }
      }

      // If any product is short, abort the whole transaction immediately with 400
      if (shortages.length > 0) {
        const messageDetails = shortages
          .map(
            (s) =>
              `• "${s.productName}" (SKU: ${s.sku}): Available = ${s.available}, Required = ${s.requested} (Short by ${s.shortBy})`
          )
          .join('\n');

        throw AppError.badRequest(
          `Cannot confirm challan "${challan.challanNumber}". Insufficient stock for ${shortages.length} product(s):\n${messageDetails}`,
          { shortages }
        );
      }

      // 6. All lines pass! Decrement stock and write StockLog rows
      for (const [productId, quantityToDeduct] of requiredQtyByProduct.entries()) {
        // Enforce stock >= quantityToDeduct in WHERE clause as an atomic safeguard
        const updateResult = await tx.product.updateMany({
          where: {
            id: productId,
            currentStock: { gte: quantityToDeduct },
          },
          data: {
            currentStock: { decrement: quantityToDeduct },
          },
        });

        if (updateResult.count === 0) {
          // This should never happen due to row locking, but guards against any edge case
          throw AppError.badRequest(
            `Stock validation failed at database level for product ID "${productId}". Transaction rolled back.`
          );
        }

        // Write StockLog entry
        await tx.stockLog.create({
          data: {
            productId,
            quantityChanged: quantityToDeduct,
            movementType: 'OUT',
            reason: `Challan ${challan.challanNumber}`,
            createdBy: userId,
          },
        });
      }

      // 7. Update Challan status to CONFIRMED
      const confirmedChallan = await tx.challan.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
        },
        include: {
          customer: true,
          createdByUser: {
            select: { id: true, name: true, email: true, role: true },
          },
          items: true,
        },
      });

      return confirmedChallan;
    });
  }

  static async cancelChallan(id: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const challan = await tx.challan.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!challan) {
        throw AppError.notFound(`Challan with ID "${id}" not found`);
      }

      if (challan.status === 'CANCELLED') {
        throw AppError.badRequest(`Challan "${challan.challanNumber}" is already CANCELLED.`);
      }

      // If DRAFT, simply mark as CANCELLED (no stock was deducted)
      if (challan.status === 'DRAFT') {
        return await tx.challan.update({
          where: { id },
          data: { status: 'CANCELLED' },
          include: { customer: true, items: true },
        });
      }

      // If CONFIRMED, reverse the stock movements
      if (challan.status === 'CONFIRMED') {
        // Aggregate quantities
        const returnQtyByProduct = new Map<string, number>();
        for (const item of challan.items) {
          const cur = returnQtyByProduct.get(item.productId) || 0;
          returnQtyByProduct.set(item.productId, cur + item.quantity);
        }

        for (const [productId, qtyToReturn] of returnQtyByProduct.entries()) {
          // Increment stock back
          await tx.product.update({
            where: { id: productId },
            data: {
              currentStock: { increment: qtyToReturn },
            },
          });

          // Write IN log entry
          await tx.stockLog.create({
            data: {
              productId,
              quantityChanged: qtyToReturn,
              movementType: 'IN',
              reason: `Cancelled Challan ${challan.challanNumber}`,
              createdBy: userId,
            },
          });
        }

        return await tx.challan.update({
          where: { id },
          data: { status: 'CANCELLED' },
          include: { customer: true, items: true },
        });
      }
    });
  }

  static async listChallans(query: ListChallansQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ChallanWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { challanNumber: { contains: s, mode: 'insensitive' } },
        { customer: { name: { contains: s, mode: 'insensitive' } } },
        { customer: { businessName: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, challans] = await Promise.all([
      prisma.challan.count({ where }),
      prisma.challan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              businessName: true,
              mobile: true,
              email: true,
            },
          },
          createdByUser: {
            select: { id: true, name: true, role: true },
          },
          items: {
            select: {
              id: true,
              productId: true,
              productNameSnapshot: true,
              unitPriceSnapshot: true,
              quantity: true,
            },
          },
        },
      }),
    ]);

    return {
      data: challans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getChallanById(id: string) {
    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdByUser: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: true,
      },
    });

    if (!challan) {
      throw AppError.notFound(`Challan with ID "${id}" not found`);
    }

    return challan;
  }
}
