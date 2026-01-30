import { customAlphabet } from 'nanoid';
import { prisma } from '../application/database';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

export async function generateUniqueReferralCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = `REF-${nanoid()}`;

    // Check if code already exists
    try {
      const existing = await prisma.user.findUnique({
        where: { referralCode: code },
        select: { id: true },
      });

      if (!existing) {
        return code;
      }
    } catch (error) {
      console.error('Error checking referral code uniqueness:', error);
    }
    attempts++;
  }

  // Fallback
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REF-${timestamp}${random}`;
}

interface CreateReferralCouponParams {
  userId: string;
}

// Creates a discount coupon for new user who registered with referral code. Coupon expires 3 months after creation
export async function createReferralCoupon(
  params: CreateReferralCouponParams,
): Promise<void> {
  const { userId } = params;

  // Calculate expiration (3 months from now)
  const validFrom = new Date();
  const validUntil = new Date();
  validUntil.setMonth(validUntil.getMonth() + 3);

  // Generate unique coupon code
  const couponCode = `WELCOME-${nanoid()}`;

  try {
    await prisma.coupon.create({
      data: {
        code: couponCode,
        userId,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minPurchase: 0,
        maxDiscount: null,
        usageLimit: 1,
        usedCount: 0,
        validFrom,
        validUntil,
        isActive: true,
        eventId: null,
      },
    });

    console.log(`Referral coupon created for user ${userId}: ${couponCode}`);
  } catch (error) {
    console.error('Failed to create referral coupon:', error);
    throw new Error('Failed to create referral coupon');
  }
}

interface CreditReferralPointsParams {
  referrerId: string;
}

// Credits 10,000 points to referrer when someone uses their referral code. Points expire 3 months after being credited
export async function creditReferralPoints(
  params: CreditReferralPointsParams,
): Promise<void> {
  const { referrerId } = params;

  const pointsAmount = 10000;

  // Calculate expiration (3 months from now)
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 3);

  try {
    await prisma.$transaction([
      // Create point entry with expiration
      prisma.userPoint.create({
        data: {
          userId: referrerId,
          amount: pointsAmount,
          source: 'REFERRAL',
          expiresAt,
        },
      }),

      // Update user's total points
      prisma.user.update({
        where: { id: referrerId },
        data: {
          points: { increment: pointsAmount },
        },
      }),
    ]);

    console.log(`Credited ${pointsAmount} points to user ${referrerId}`);
  } catch (error) {
    console.error('Failed to credit referral points:', error);
    throw new Error('Failed to credit referral points');
  }
}

interface ProcessReferralRewardsParams {
  newUserId: string;
  referrerId: string;
}

// Processes all referral rewards -> Creates coupon for new user and credits points to referrer

export async function processReferralRewards(
  params: ProcessReferralRewardsParams,
): Promise<void> {
  const { newUserId, referrerId } = params;

  try {
    // Execute both operations in parallel
    await Promise.all([
      createReferralCoupon({ userId: newUserId }),
      creditReferralPoints({ referrerId }),
    ]);

    console.log(`Referral rewards processed successfully`);
  } catch (error) {
    console.error('Failed to process referral rewards:', error);
    throw error;
  }
}
