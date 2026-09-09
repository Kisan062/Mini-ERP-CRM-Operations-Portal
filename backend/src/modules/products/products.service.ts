import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { AppError } from '../../errors/AppError';
import {
  CreateProductInput,
  UpdateProductInput,
  StockAdjustmentInput,
  ListProductsQuery,
} from './products.schema';

export class ProductsService {
  static async createProduct(data: CreateProductInput, userId: string) {
    const existingSku = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existingSku) {
      throw AppError.conflict(`Product with SKU "${data.sku}" already exists`);
    }

    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          sku: data.sku,
          category: data.category,
          unitPrice: new Prisma.Decimal(data.unitPrice),
          currentStock: data.initialStock,
          minStockAlert: data.minStockAlert,
          location: data.location || null,
        },
      });

      if (data.initialStock > 0) {
        await tx.stockLog.create({
          data: {
            productId: product.id,
            quantityChanged: data.initialStock,
            movementType: 'IN',
            reason: 'Initial Stock',
            createdBy: userId,
          },
        });
      }

      return product;
    });
  }

  static async updateProduct(id: string, data: UpdateProductInput) {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw AppError.notFound(`Product with ID "${id}" not found`);
    }

    const updateData: Prisma.ProductUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.unitPrice !== undefined) updateData.unitPrice = new Prisma.Decimal(data.unitPrice);
    if (data.minStockAlert !== undefined) updateData.minStockAlert = data.minStockAlert;
    if (data.location !== undefined) updateData.location = data.location;

    return await prisma.product.update({
      where: { id },
      data: updateData,
    });
  }

  static async adjustStock(productId: string, data: StockAdjustmentInput, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw AppError.notFound(`Product with ID "${productId}" not found`);
      }

      if (data.movementType === 'OUT') {
        if (product.currentStock < data.quantity) {
          throw AppError.badRequest(
            `Insufficient stock for "${product.name}" (SKU: ${product.sku}). Available: ${product.currentStock}, Requested: ${data.quantity}`
          );
        }
      }

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          currentStock:
            data.movementType === 'IN'
              ? { increment: data.quantity }
              : { decrement: data.quantity },
        },
      });

      const stockLog = await tx.stockLog.create({
        data: {
          productId,
          quantityChanged: data.quantity,
          movementType: data.movementType,
          reason: data.reason,
          createdBy: userId,
        },
        include: {
          createdByUser: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      return { product: updatedProduct, stockLog };
    });
  }

  static async listProducts(query: ListProductsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { sku: { contains: s, mode: 'insensitive' } },
        { category: { contains: s, mode: 'insensitive' } },
        { location: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = { equals: query.category, mode: 'insensitive' };
    }

    if (query.lowStockOnly) {
      // Find IDs where currentStock <= minStockAlert
      const lowStockProducts = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Product" WHERE "currentStock" <= "minStockAlert"
      `;
      const ids = lowStockProducts.map((p) => p.id);
      where.id = { in: ids };
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            createdByUser: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw AppError.notFound(`Product with ID "${id}" not found`);
    }

    return product;
  }

  static async getProductLogs(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw AppError.notFound(`Product with ID "${productId}" not found`);
    }

    return await prisma.stockLog.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: {
          select: { id: true, name: true, role: true },
        },
      },
    });
  }
}
