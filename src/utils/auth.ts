import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '../application/database';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        input: true,
      },
    },
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7,
    },

    user: {
      additionalFields: ['role'],
    },
  },

  cookies: {
    sessionToken: {
      attributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
      },
    },
  },

  trustedOrigins: ['http://localhost:5173'],
});
