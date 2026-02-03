import { prisma } from '../application/database';
import { ResponseError } from '../error/response-error';
import { Coupon, User, UserRole } from '../generated/prisma/client';
import {
  CouponResponse,
  CreateCouponRequest,
  toCouponResponse,
  ValidateCouponRequest,
  ValidateCouponResponse,
} from '../model/coupon-model';
import { CouponValidation } from '../validations/coupon-validation';
import { Validation } from '../validations/validation';

export type PaginatedCouponResponse = {
  data: CouponResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export class CouponService {
  // Create coupon
  static async createCoupon(
    user: User,
    request: CreateCouponRequest,
  ): Promise<CouponResponse> {
    // Validate request
    const createRequest = Validation.validate<CreateCouponRequest>(
      CouponValidation.CREATE,
      request,
    );

    // Event specific coupon can only be created by event organizer for their events
    if (createRequest.eventId) {
      if (user.role !== UserRole.ORGANIZER) {
        throw new ResponseError(
          403,
          'Only organizers can create event-specific coupons',
        );
      }

      const event = await prisma.event.findUnique({
        where: { id: createRequest.eventId },
      });

      if (!event) {
        throw new ResponseError(404, 'Event not found');
      }

      if (event.organizerId !== user.id) {
        throw new ResponseError(
          403,
          'You can only create coupons for your own events',
        );
      }
    }

    // Check if coupon code already exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: createRequest.code },
    });

    if (existingCoupon) {
      throw new ResponseError(409, 'Coupon code already exists');
    }

    // Create coupon
    const coupon = await prisma.coupon.create({
      data: {
        code: createRequest.code,
        discountType: createRequest.discountType,
        discountValue: createRequest.discountValue,
        minPurchase: createRequest.minPurchase || 0,
        maxDiscount: createRequest.maxDiscount,
        usageLimit: createRequest.usageLimit,
        validFrom: createRequest.validFrom,
        validUntil: createRequest.validUntil,
        eventId: createRequest.eventId,
      },
    });

    return toCouponResponse(coupon);
  }

  // Validate coupon
  static async validateCoupon(
    request: ValidateCouponRequest,
  ): Promise<ValidateCouponResponse> {
    const validateRequest = Validation.validate<ValidateCouponRequest>(
      CouponValidation.VALIDATE,
      request,
    );

    const coupon = await prisma.coupon.findUnique({
      where: { code: validateRequest.couponCode },
    });

    if (!coupon) {
      return {
        isValid: false,
        discountAmount: 0,
        finalAmount: validateRequest.amount,
        message: 'Coupon not found',
      };
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return {
        isValid: false,
        discountAmount: 0,
        finalAmount: validateRequest.amount,
        message: 'Coupon is not active',
      };
    }

    // Check if coupon has expired
    const now = new Date();
    if (coupon.validUntil < now) {
      return {
        isValid: false,
        discountAmount: 0,
        finalAmount: validateRequest.amount,
        message: 'Coupon has expired',
      };
    }

    // Check if coupon is at usage limit
    if (coupon.usedCount >= coupon.usageLimit) {
      return {
        isValid: false,
        discountAmount: 0,
        finalAmount: validateRequest.amount,
        message: 'Coupon usage limit reached',
      };
    }

    // Event-specific coupon validation
    if (coupon.eventId && coupon.eventId !== validateRequest.eventId) {
      return {
        isValid: false,
        discountAmount: 0,
        finalAmount: validateRequest.amount,
        message: 'This coupon is not valid for this event',
      };
    }

    // Check minimum purchase requirement
    if (validateRequest.amount < coupon.minPurchase) {
      return {
        isValid: false,
        discountAmount: 0,
        finalAmount: validateRequest.amount,
        message: `Minimum purchase of ${coupon.minPurchase} required`,
      };
    }

    // Calculate discount
    const discountAmount = this.calculateDiscount(
      coupon,
      validateRequest.amount,
    );
    const finalAmount = Math.max(0, validateRequest.amount - discountAmount);

    return {
      isValid: true,
      discountAmount,
      finalAmount,
    };
  }

  // Helper
  private static calculateDiscount(coupon: Coupon, baseAmount: number): number {
    if (baseAmount < coupon.minPurchase) {
      return 0;
    }

    let discount = 0;

    if (coupon.discountType === 'PERCENTAGE') {
      discount = (baseAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else if (coupon.discountType === 'FIXED') {
      discount = coupon.discountValue;
    }

    return Math.min(discount, baseAmount);
  }
}
