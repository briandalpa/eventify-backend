import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../service/category-service';

export class CategoryController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const response = await CategoryService.listCategories();
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
}
