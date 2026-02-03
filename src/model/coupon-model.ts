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
