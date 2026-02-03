import { prisma } from '../application/database';
import { ResponseError } from '../error/response-error';
import { User, UserRole } from '../generated/prisma/client';
import {
  CouponResponse,
  CreateCouponRequest,
  toCouponResponse,
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
}
