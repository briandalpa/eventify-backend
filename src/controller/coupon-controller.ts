import { NextFunction, Response } from 'express';
import { UserRequest } from '../types/user-request';
import { Validation } from '../validations/validation';
import {
  CreateCouponRequest,
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
}
