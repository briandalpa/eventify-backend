import { z, ZodType } from 'zod';
import { UserRole } from '../generated/prisma/enums';
import type { CreateUserRequest, LoginUserRequest } from '../model/user-model';

export class UserValidation {
  static readonly REGISTER: ZodType<CreateUserRequest> = z.object({
    name: z.string().min(3).max(100),
    email: z.email(),
    password: z.string().min(8).max(100),
    role: z.enum(UserRole),
    referralCode: z.string().optional(),
  });

  static readonly LOGIN: ZodType<LoginUserRequest> = z.object({
    email: z.email(),
    password: z.string().min(8).max(100),
  });
}
