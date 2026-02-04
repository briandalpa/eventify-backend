import { NextFunction, Response } from 'express';
import { UserRequest } from '../types/user-request';
import { Validation } from '../validations/validation';
import {
  CreateCouponRequest,
  UpdateCouponRequest,
  ValidateCouponRequest,
} from '../model/coupon-model';
import { CouponValidation } from '../validations/coupon-validation';
import { CouponService } from '../service/coupon-service';

export class CouponController {
  // Create coupon (POST /api/coupons)
  static async create(req: UserRequest, res: Response, next: NextFunction) {
    try {
      const request = Validation.validate<CreateCouponRequest>(
        CouponValidation.CREATE,
        req.body,
      );
      const response = await CouponService.createCoupon(req.user!, request);
      res.status(201).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  // Validate coupon (POST /api/coupons/validate)
  static async validate(req: UserRequest, res: Response, next: NextFunction) {
    try {
      const request = Validation.validate<ValidateCouponRequest>(
        CouponValidation.VALIDATE,
        req.body,
      );
      const response = await CouponService.validateCoupon(request);
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  // List coupons (GET /api/coupons)
  static async list(req: UserRequest, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const eventId = req.query.eventId as string | undefined;

      const response = await CouponService.listCoupons(page, limit, eventId);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  // Update coupon (PATCH /api/coupons/:id)
  static async update(req: UserRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const request = Validation.validate<UpdateCouponRequest>(
        CouponValidation.UPDATE,
        req.body,
      );
      const response = await CouponService.updateCoupon(req.user!, id, request);
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete coupon (DELETE /api/coupons/:id)
  static async delete(req: UserRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await CouponService.deleteCoupon(req.user!, id);
      res.status(200).json({
        data: 'OK',
      });
    } catch (error) {
      next(error);
    }
  }
}
