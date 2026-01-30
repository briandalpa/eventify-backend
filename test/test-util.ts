import { prisma } from '../src/application/database';
import bcrypt from 'bcrypt';

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
}
