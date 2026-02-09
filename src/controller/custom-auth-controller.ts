import { Router, Request, Response } from 'express';
import { auth } from '../utils/auth';
import {
  generateUniqueReferralCode,
  processReferralRewards,
} from '../service/referral-service';
import { prisma } from '../application/database';
import { logger } from '../application/logging';

const router = Router();

// Custom registration endpoint with referral code generation
router.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, referredBy } = req.body;

    // Validate required fields
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        error: 'Missing required fields: email, password, name, role',
      });
    }

    // Create user via Better Auth
    const signUpResponse = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
        role,
      },
    });

    // Check if signup was successful
    if (!signUpResponse || !signUpResponse.user) {
      return res.status(400).json({
        error: 'Failed to create user',
      });
    }

    const userId = signUpResponse.user.id;
    if (!userId) {
      return res.status(500).json({
        error: 'User created but ID not returned',
      });
    }

    // Generate referral code
    let updatedUser;
    try {
      const referralCode = await generateUniqueReferralCode();

      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          referralCode,
          referredBy: referredBy || null,
        },
      });

      logger.info(
        `Generated referral code for user ${userId}: ${referralCode}`,
      );

      // If user was referred, process rewards
      if (referredBy) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: referredBy },
          select: { id: true },
        });

        if (referrer) {
          await processReferralRewards({
            newUserId: userId,
            referrerId: referrer.id,
          });

          logger.info(
            `Referral rewards processed for user ${userId} referred by ${referrer.id}`,
          );
        } else {
          logger.warn(
            `Referral code ${referredBy} not found for user ${userId}`,
          );
        }
      }
    } catch (referralError) {
      logger.error(
        `Failed to process referral for user ${userId}:`,
        referralError,
      );
      // Use original user if referral failed
      updatedUser = signUpResponse.user;
    }

    // Return success response with updated user
    return res.status(201).json({
      data: {
        user: updatedUser,
        token: signUpResponse.token,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    return res.status(500).json({
      error: 'Internal server error during registration',
    });
  }
});

export default router;
