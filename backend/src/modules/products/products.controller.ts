import { Request, Response, NextFunction } from 'express';
import { ProductsService } from './products.service';

export class ProductsController {
  static async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductsService.createProduct(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductsService.updateProduct(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  static async adjustStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ProductsService.adjustStock(req.params.id, req.body, req.user!.id);
      res.status(200).json({
        success: true,
        message: `Stock adjusted successfully (${req.body.movementType})`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ProductsService.listProducts(req.query as any);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductsService.getProductById(req.params.id);
      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProductLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const logs = await ProductsService.getProductLogs(req.params.id);
      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
}
