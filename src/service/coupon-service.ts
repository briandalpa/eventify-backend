import { prisma } from '../application/database';
import { ResponseError } from '../error/response-error';
import { Coupon, User, UserRole } from '../generated/prisma/client';
import {
  CouponResponse,
  CreateCouponRequest,
  toCouponResponse,
  UpdateCouponRequest,
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

  // Update coupon
  static async updateCoupon(
    user: User,
    couponId: string,
    request: UpdateCouponRequest,
  ): Promise<CouponResponse> {
    // Get coupon
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new ResponseError(404, 'Coupon not found');
    }

    // Event specific coupons can only be updated by organizers of that event
    if (coupon.eventId) {
      if (user.role !== UserRole.ORGANIZER) {
        throw new ResponseError(
          403,
          'Only organizers can update event-specific coupons',
        );
      }

      const event = await prisma.event.findUnique({
        where: { id: coupon.eventId },
      });

      if (!event || event.organizerId !== user.id) {
        throw new ResponseError(
          403,
          'You can only update coupons for your own events',
        );
      }
    }

    // Validate request
    const updateRequest = Validation.validate<UpdateCouponRequest>(
      CouponValidation.UPDATE,
      request,
    );

    // Check if new code already exists
    if (updateRequest.code && updateRequest.code !== coupon.code) {
      const existingCoupon = await prisma.coupon.findUnique({
        where: { code: updateRequest.code },
      });

      if (existingCoupon) {
        throw new ResponseError(409, 'Coupon code already exists');
      }
    }

    // Update coupon
    const updated = await prisma.coupon.update({
      where: { id: couponId },
      data: {
        code: updateRequest.code || coupon.code,
        discountValue:
          updateRequest.discountValue !== undefined
            ? updateRequest.discountValue
            : coupon.discountValue,
        minPurchase:
          updateRequest.minPurchase !== undefined
            ? updateRequest.minPurchase
            : coupon.minPurchase,
        maxDiscount:
          updateRequest.maxDiscount !== undefined
            ? updateRequest.maxDiscount
            : coupon.maxDiscount,
        usageLimit:
          updateRequest.usageLimit !== undefined
            ? updateRequest.usageLimit
            : coupon.usageLimit,
        validUntil: updateRequest.validUntil || coupon.validUntil,
        isActive:
          updateRequest.isActive !== undefined
            ? updateRequest.isActive
            : coupon.isActive,
      },
    });

    return toCouponResponse(updated);
  }

  // Delete coupon
  static async deleteCoupon(user: User, couponId: string): Promise<void> {
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new ResponseError(404, 'Coupon not found');
    }

    // Event specific coupons can only be deleted by organizers of that event
    if (coupon.eventId) {
      if (user.role !== UserRole.ORGANIZER) {
        throw new ResponseError(
          403,
          'Only organizers can delete event-specific coupons',
        );
      }

      const event = await prisma.event.findUnique({
        where: { id: coupon.eventId },
      });

      if (!event || event.organizerId !== user.id) {
        throw new ResponseError(
          403,
          'You can only delete coupons for your own events',
        );
      }
    }

    await prisma.coupon.delete({
      where: { id: couponId },
    });
  }

  // List coupons
  static async listCoupons(
    page: number = 1,
    limit: number = 10,
    eventId?: string,
  ): Promise<PaginatedCouponResponse> {
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
      validUntil: { gte: new Date() },
    };

    if (eventId) {
      where.eventId = eventId;
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.coupon.count({ where }),
    ]);

    return {
      data: coupons.map((c) => toCouponResponse(c)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
