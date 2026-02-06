import { Request, Response, NextFunction } from 'express';
import {
  CreateUserRequest,
  LoginUserRequest,
  UpdateUserRequest,
} from '../model/user-model';
import { UserService } from '../service/user-service';
import { UserRequest } from '../types/user-request';

export class UserController {
  // Register
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const request: CreateUserRequest = req.body as CreateUserRequest;
      const response = await UserService.register(request);
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  // Login
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const request: LoginUserRequest = req.body as LoginUserRequest;
      const response = await UserService.login(request);
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get
  static async get(req: UserRequest, res: Response, next: NextFunction) {
    try {
      const response = await UserService.get(req.user!);
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update
  static async update(req: UserRequest, res: Response, next: NextFunction) {
    try {
      const request: UpdateUserRequest = req.body as UpdateUserRequest;
      const response = await UserService.update(req.user!, request);
      res.status(200).json({
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  // Logout
  static async logout(req: UserRequest, res: Response, next: NextFunction) {
    try {
      const response = await UserService.logout(req.user!);
      res.status(200).json({
        data: 'OK',
      });
    } catch (error) {
      next(error);
    }
  }

  // Forgot password
  static async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          error: 'Email is required',
        });
      }
      await UserService.forgotPassword(email);
      res.status(200).json({
        data: 'Password reset email sent',
      });
    } catch (error) {
      next(error);
    }
  }
}
