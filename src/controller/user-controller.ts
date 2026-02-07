import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth-middleware';
import { prisma } from '../application/database';

export class UserController {
  static async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          phone: true,
          bio: true,
          points: true,
          referralCode: true,
        },
      });

      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          name: req.body.name,
          phone: req.body.phone,
          bio: req.body.bio,
          avatarUrl: req.body.avatarUrl,
        },
      });

      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: AuthRequest, res: Response) {
    res.status(200).json({
      message: 'OK',
    });
  }
}
