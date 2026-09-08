import { Request, Response, NextFunction } from 'express';
import { ChallansService } from './challans.service';

export class ChallansController {
  static async createChallan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challan = await ChallansService.createChallan(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        message: 'Challan created successfully as DRAFT',
        data: challan,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateChallan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challan = await ChallansService.updateChallan(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Draft challan updated successfully',
        data: challan,
      });
    } catch (error) {
      next(error);
    }
  }

  static async confirmChallan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challan = await ChallansService.confirmChallan(req.params.id, req.user!.id);
      res.status(200).json({
        success: true,
        message: `Challan ${challan.challanNumber} confirmed successfully. Inventory decremented.`,
        data: challan,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelChallan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challan = await ChallansService.cancelChallan(req.params.id, req.user!.id);
      res.status(200).json({
        success: true,
        message: `Challan ${challan?.challanNumber} cancelled successfully.`,
        data: challan,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listChallans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ChallansService.listChallans(req.query as any);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getChallanById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challan = await ChallansService.getChallanById(req.params.id);
      res.status(200).json({
        success: true,
        data: challan,
      });
    } catch (error) {
      next(error);
    }
  }
}
