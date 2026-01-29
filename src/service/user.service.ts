// Handle business logic

import { ResponseError } from '../error/response-error';
import { UserValidation } from '../validations/user-validation';
import { Validation } from '../validations/validation';
import {
  generateUniqueReferralCode,
  processReferralRewards,
} from './referral.service';
import {
  toUserResponse,
  type CreateUserRequest,
  type UserResponse,
} from '../model/user.model';
import bcrypt from 'bcrypt';
import { prisma } from '../application/database';

export class UserService {
  static async register(request: CreateUserRequest): Promise<UserResponse> {
    const registerRequest = Validation.validate<CreateUserRequest>(
      UserValidation.REGISTER,
      request,
    );

    // Check if email already exist
    const totalUserWithSameEmail = await prisma.user.count({
      where: {
        email: registerRequest.email,
      },
    });

    if (totalUserWithSameEmail != 0) {
      throw new ResponseError(400, 'Email already exists');
    }

    let referrer = null;

    if (request.referralCode) {
      referrer = await prisma.user.findUnique({
        where: { referralCode: request.referralCode },
        select: { id: true, referralCode: true }, // Only select needed fields
      });

      if (!referrer) {
        throw new ResponseError(400, 'Invalid referral code'); // ✅ Use ResponseError for consistency
      }
    }
    // Generate new user's unique referral code
    const newReferralCode = await generateUniqueReferralCode();

    // Create user
    const user = await prisma.user.create({
      data: {
        name: registerRequest.name,
        email: registerRequest.email,
        password: await bcrypt.hash(registerRequest.password, 10),
        role: registerRequest.role,
        referralCode: newReferralCode,
        referredBy: registerRequest.referralCode || null,
      },
    });

    // Create rewards if referred
    if (referrer) {
      await processReferralRewards({
        newUserId: user.id,
        referrerId: referrer.id,
      });
    }

    return toUserResponse(user);
  }
}
