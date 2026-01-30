import type { User } from '../generated/prisma/client';
import type { UserRole } from '../generated/prisma/enums';

export type UserResponse = {
  name: string;
  email: string;
  token?: string;
  role: UserRole;
  referralCode: string;
  points?: number;
};

export type CreateUserRequest = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  referralCode?: string;
};

export type LoginUserRequest = {
  email: string;
  password: string;
};

export type UpdateUserRequest = {
  name?: string;
  password?: string;
};

export interface UserProfile extends UserResponse {
  avatarUrl?: string;
  phone?: string;
  bio?: string;
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toUserResponse(user: User): UserResponse {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    referralCode: user.referralCode,
    points: user.points,
  };
}
