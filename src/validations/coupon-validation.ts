import { z, ZodType } from 'zod';
import {
  CreateCouponRequest,
  ValidateCouponRequest,
} from '../model/coupon-model';
import { DiscountType } from '../generated/prisma/enums';

export class CouponValidation {
  static readonly CREATE: ZodType<CreateCouponRequest> = z
    .object({
      code: z
        .string()
        .min(3, 'Coupon code must be at least 3 characters long')
        .max(50, 'Coupon code must be at most 50 characters long')
        .regex(
          /^[A-Z0-9_-]+$/,
          'Coupon code can only contain uppercase letters, numbers, underscores, and hyphens',
        ),
      discountType: z.enum(DiscountType),
      discountValue: z.number().int().min(0, 'Discount value must be positive'),
      minPurchase: z.number().int().min(0).default(0).optional(),
      maxDiscount: z.number().int().min(0).optional(),
      usageLimit: z.number().int().min(1, 'Usage limit must be at least 1'),
      validFrom: z.coerce.date(),
      validUntil: z.coerce.date(),
      eventId: z.string().optional(),
    })
    .refine((data) => data.validUntil > data.validFrom, {
      message: 'Valid until must be after valid from',
      path: ['validUntil'],
    });

  static readonly VALIDATE: ZodType<ValidateCouponRequest> = z.object({
    couponCode: z.string().min(1),
    eventId: z.string().min(1),
    amount: z.number().int().min(0),
  });
}
