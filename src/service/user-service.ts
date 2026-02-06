// Handle business logic

import { ResponseError } from '../error/response-error';
import { UserValidation } from '../validations/user-validation';
import { Validation } from '../validations/validation';
import {
  generateUniqueReferralCode,
  processReferralRewards,
} from './referral-service';
import {
  toUserResponse,
  type CreateUserRequest,
  type UserResponse,
  LoginUserRequest,
  UpdateUserRequest,
} from '../model/user-model';
import { EmailService } from './email-service';
import { logger } from '../application/logging';
import bcrypt from 'bcrypt';
import { prisma } from '../application/database';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../generated/prisma/client';

export class UserService {
  // Register User
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
        select: { id: true, referralCode: true },
      });

      if (!referrer) {
        throw new ResponseError(400, 'Invalid referral code');
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

  // Login User
  static async login(request: LoginUserRequest): Promise<UserResponse> {
    // Validate
    const loginRequest = Validation.validate<LoginUserRequest>(
      UserValidation.LOGIN,
      request,
    );

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: {
        email: loginRequest.email,
      },
    });

    if (!user) {
      throw new ResponseError(401, 'Email or password is wrong');
    }

    // If user is valid, check password
    const isPasswordValid = await bcrypt.compare(
      loginRequest.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new ResponseError(401, 'Email or password is wrong');
    }

    // If valid, create/change token
    user = await prisma.user.update({
      where: {
        email: loginRequest.email,
      },
      data: {
        token: uuidv4(),
      },
    });

    // Create response
    const response = toUserResponse(user);
    response.token = user.token!;
    return response;
  }

  // Get user
  static async get(user: User): Promise<UserResponse> {
    return toUserResponse(user);
  }

  // Update user
  static async update(
    user: User,
    request: UpdateUserRequest,
  ): Promise<UserResponse> {
    const updateRequest = Validation.validate<UpdateUserRequest>(
      UserValidation.UPDATE,
      request,
    );

    if (updateRequest.name) {
      user.name = updateRequest.name;
    }

    if (updateRequest.password) {
      user.password = await bcrypt.hash(updateRequest.password, 10);
    }

    const result = await prisma.user.update({
      where: {
        email: user.email,
      },
      data: user,
    });

    return toUserResponse(result);
  }

  // Logout user

  static async logout(user: User): Promise<UserResponse> {
    const result = await prisma.user.update({
      where: {
        email: user.email,
      },
      data: {
        token: null,
      },
    });

    return toUserResponse(result);
  }

  // Forgot password
  static async forgotPassword(email: string): Promise<void> {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new ResponseError(404, 'User not found');
    }

    // Generate reset token
    const resetToken = uuidv4();

    // Set expiry to 1 hour from now
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

    try {
      // Update user with reset token and expiry
      await prisma.user.update({
        where: {
          email,
        },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      });

      // Construct reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      // Send password reset email
      try {
        await EmailService.sendPasswordResetEmail(email, resetToken, resetUrl);
        logger.info(`Password reset email sent to ${email}`);
      } catch (emailError) {
        logger.error(
          `Failed to send password reset email to ${email}:`,
          emailError,
        );
      }

      logger.info(`Forgot password request processed for ${email}`);
    } catch (error) {
      logger.error('Failed to process forgot password request:', error);
      throw error;
    }
  }
}
