import { Request, Response, NextFunction } from 'express';
import { CustomersService } from './customers.service';

export class CustomersController {
  static async createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await CustomersService.createCustomer(req.body);
      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await CustomersService.updateCustomer(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Customer updated successfully',
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  static async addFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await CustomersService.addFollowUp(
        req.params.id,
        req.body,
        req.user?.name || 'User'
      );
      res.status(200).json({
        success: true,
        message: 'Follow-up recorded successfully',
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CustomersService.listCustomers(req.query as any);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await CustomersService.getCustomerById(req.params.id);
      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }
}
