import { Request, Response, NextFunction } from 'express';

import { prisma } from '../application/database';
import { UserRole } from '../generated/prisma/enums';
import { auth } from '../utils/auth';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    emailVerified: boolean;
  };
  session?: {
    id: string;
    expiresAt: Date;
  };
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthRequest;

  (async () => {
    try {
      const headers = new Headers();
      Object.entries(req.headers).forEach(([key, value]) => {
        if (value) {
          headers.set(key, Array.isArray(value) ? value[0] : value);
        }
      });

      const session = await auth.api.getSession({ headers });

      if (!session) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          avatarUrl: true,
        },
      });

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      authReq.user = user;
      authReq.session = session.session;

      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid session' });
    }
  })();
}

function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;

    if (!authReq.user || authReq.user.role !== role) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}

export { requireAuth, requireRole, AuthRequest };
