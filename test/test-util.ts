import { prisma } from '../src/application/database';
import bcrypt from 'bcrypt';
import { User } from '../src/generated/prisma/client';

export class UserTest {
  static async delete() {
    await prisma.user.deleteMany({
      where: {
        email: 'test@example.com',
      },
    });
  }

  static async create() {
    await prisma.user.create({
      data: {
        name: 'Test',
        email: 'test@example.com',
        password: await bcrypt.hash('hashed_password', 10),
        role: 'CUSTOMER',
        token: 'test',
        referralCode: 'REF-1234',
      },
    });
  }

  static async get(): Promise<User> {
    const user = await prisma.user.findFirst({
      where: {
        email: 'test@example.com',
      },
    });

    if (!user) {
      throw new Error('User is not found');
    }

    return user;
  }
}
