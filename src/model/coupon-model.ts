import { Coupon } from '../generated/prisma/client';
import { DiscountType } from '../generated/prisma/enums';

export type CreateCouponRequest = {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit: number;
  validFrom: Date | string;
  validUntil: Date | string;
  eventId?: string;
};

export type UpdateCouponRequest = {
  code?: string;
  discountValue?: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  validUntil?: Date | string;
  isActive?: boolean;
};

export type CouponResponse = {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minPurchase: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  eventId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ValidateCouponRequest = {
  couponCode: string;
  eventId: string;
  amount: number;
};

export type ValidateCouponResponse = {
  isValid: boolean;
  discountAmount: number;
  finalAmount: number;
  message?: string;
};

export type PaginatedCouponResponse = {
  data: CouponResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function toCouponResponse(coupon: Coupon): CouponResponse {
  return {
    id: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minPurchase: coupon.minPurchase,
    maxDiscount: coupon.maxDiscount || undefined,
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    validFrom: coupon.validFrom,
    validUntil: coupon.validUntil,
    isActive: coupon.isActive,
    eventId: coupon.eventId || undefined,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
}
